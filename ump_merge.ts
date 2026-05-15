import * as fs from 'fs';
import { CompositeBuffer, UmpReader } from 'googlevideo/ump';
import { MediaHeader, UMPPartId } from 'googlevideo/protos';
import { concatenateChunks } from 'googlevideo/utils';
import type { Part } from 'googlevideo/shared-types';

function handleMediaHeader(part: Part) {
  const mediaHeader = MediaHeader.decode(concatenateChunks(part.data.chunks));
  console.log('Media Header:', mediaHeader);
}

function handleMedia(part: Part) {
  const headerId = part.data.getUint8(0);
  const dataBuffer = part.data.split(1).remainingBuffer;
  console.log(`Media Part (Associated Header ID: ${headerId}):`, dataBuffer.getLength(), 'bytes');
  // const totalBuffer = Buffer.concat(dataBuffer.chunks);
  // console.log(`Write media_file_${counter}: `, totalBuffer.byteLength, 'bytes');
  // fs.writeFileSync(`media_file_${counter}`, totalBuffer);
  // counter++;

  for (const chunk of dataBuffer.chunks) {
    console.log('File append size: ', chunk.byteLength, 'bytes');
    fs.appendFileSync('media_file', chunk);
  }
}

function handleMediaEnd(part: Part) {
  const headerId = part.data.getUint8(0);
  console.log(`Media End Part (Associated Header ID: ${headerId}):`, part.data.split(1).remainingBuffer.getLength(), 'bytes');
}

const umpPartHandlers = new Map<UMPPartId, (part: Part) => void>([
  [ UMPPartId.MEDIA_HEADER, handleMediaHeader ],
  [ UMPPartId.MEDIA, handleMedia ],
  [ UMPPartId.MEDIA_END, handleMediaEnd ]
]);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log('処理するファイル名を指定してください。');
  process.exit(1);
}

files.forEach((fileName: any, index: number) => {
  console.log(`[${index + 1}/${files.length}] ${fileName} を処理中...`);

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
