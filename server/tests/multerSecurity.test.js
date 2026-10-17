import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
function parse(upload, source) {
 const req=Readable.from([Buffer.from(source)]);req.headers={'content-type':'multipart/form-data; boundary=bound','content-length':String(Buffer.byteLength(source))};
 return new Promise(resolve=>upload(req,{},error=>resolve({error,req})));
}
const body=(field='file',value='abc')=>`--bound\r\nContent-Disposition: form-data; name="${field}"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n${value}\r\n--bound--\r\n`;
test('Multer 2.4 memory uploads and size rejection preserve expected API',async()=>{
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:4}}).single('file');
 const good=await parse(upload,body());assert.ifError(good.error);assert.equal(good.req.file.buffer.toString(),'abc');
 const big=await parse(upload,body('file','12345'));assert.equal(big.error.code,'LIMIT_FILE_SIZE');
 const wrong=await parse(upload,body('other'));assert.equal(wrong.error.code,'LIMIT_UNEXPECTED_FILE');
});
test('Multer 2.4 disk upload cleans completed earlier files on later rejection',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'zerolens-multer-smoke-'));
 try {
 const upload=multer({dest:dir,limits:{fileSize:4}}).array('file',2);
 const source=body().replace('--bound--\r\n','')+body('file','12345');
 const rejected=await parse(upload,source);assert.equal(rejected.error.code,'LIMIT_FILE_SIZE');assert.deepEqual(await fs.readdir(dir),[]);
 const good=await parse(upload,body());assert.ifError(good.error);assert.equal(good.req.files.length,1);assert.equal(await fs.readFile(good.req.files[0].path,'utf8'),'abc');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Multer 2.4 reports missing field names and truncated bodies without crashing',async()=>{
 const upload=multer({storage:multer.memoryStorage()}).single('file');
 for(const malformed of [body().replace('name="file"; ',''),body().replace('--bound--\r\n','')]){const result=await parse(upload,malformed);assert(result.error);}
});
