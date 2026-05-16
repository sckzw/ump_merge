import * as fs from 'fs';
import { globSync } from 'glob';
import { CompositeBuffer, UmpReader } from 'googlevideo/ump';
import { MediaHeader, UMPPartId } from 'googlevideo/protos';
import { concatenateChunks } from 'googlevideo/utils';
import type { Part } from 'googlevideo/shared-types';
import { Innertube, UniversalCache } from 'youtubei.js';

const videoIds: string[] = [];
let currentVideoId: string = 'unknown';
let previousVideoId: string = 'unknown';
let isFirstMediaPart: boolean = false;

function handleMediaHeader(part: Part) {
  const mediaHeader = MediaHeader.decode(concatenateChunks(part.data.chunks));
  currentVideoId = mediaHeader.videoId || 'unknown';
  console.log('Media Header:', mediaHeader);

  if (currentVideoId !== previousVideoId) {
    isFirstMediaPart = true;
    previousVideoId = currentVideoId;
    videoIds.push(currentVideoId);
    console.log(`New videoId: ${currentVideoId}`);
  }
}

function handleMedia(part: Part) {
  const headerId = part.data.getUint8(0);
  const dataBuffer = part.data.split(1).remainingBuffer;
  console.log(`Media Part (Header ID: ${headerId}):`, dataBuffer.getLength(), 'bytes');
  for (const chunk of dataBuffer.chunks) {
    if (isFirstMediaPart) {
      isFirstMediaPart = false;
      fs.writeFileSync(currentVideoId, chunk);
      console.log(`Write ${chunk.byteLength} bytes of data to ${currentVideoId} file.`);
    } else {
      fs.appendFileSync(currentVideoId, chunk);
      console.log(`Append ${chunk.byteLength} bytes of data to ${currentVideoId} file.`);
    }
  }
}

function handleMediaEnd(part: Part) {
  const headerId = part.data.getUint8(0);
  console.log(`Media End Part (Header ID: ${headerId}):`, part.data.split(1).remainingBuffer.getLength(), 'bytes');
}

const umpPartHandlers = new Map<UMPPartId, (part: Part) => void>([
  [UMPPartId.MEDIA_HEADER, handleMediaHeader],
  [UMPPartId.MEDIA, handleMedia],
  [UMPPartId.MEDIA_END, handleMediaEnd]
]);

const filePattern = process.argv[2];
if (!filePattern) {
  console.log('ファイルパスを指定してください。');
  process.exit(1);
}

const files = globSync(filePattern, { nodir: true, windowsPathsNoEscape: true }).sort();

files.forEach((fileName: string, index: number) => {
  console.log(`[${index + 1}/${files.length}] Processing ${fileName} ...`);

  const ump_file_data = fs.readFileSync(fileName);
  const uint8Array = new Uint8Array(ump_file_data);
  const buffer = new CompositeBuffer();
  buffer.append(uint8Array);

  const reader = new UmpReader(buffer);

  const partial = reader.read((part) => {
    const handler = umpPartHandlers.get(part.type);
    if (handler) {
      handler(part);
    } else {
      console.warn(`No handler for part type: ${part.type}`);
    }
  });
  if (partial !== undefined) {
    console.log(partial.data.getLength());
  }
});

const yt = await Innertube.create({
  cache: new UniversalCache(true),
  lang: 'ja',
  location: 'JP'
});

for (const videoId of videoIds) {
  const videoInfo = await yt.actions.execute('/player', {
    videoId: videoId,
    client: 'YTMUSIC',
    parse: true
  });

  const title = videoInfo.video_details?.title;
  if (title) {
    const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, '_');
    const oldFileName = videoId;
    const newFileName = `${sanitizedTitle}.mp4`;

    if (fs.existsSync(oldFileName)) {
      fs.renameSync(oldFileName, newFileName);
      console.log(`Rename ${oldFileName} to ${newFileName}`);
    }
  } else {
    console.warn(`Failed to get title of ${videoId}`);
  }
}
