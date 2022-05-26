import * as CloudStorage from "@google-cloud/storage";
import { Readable } from "stream";
import * as uuid from "uuid/v5";

export default class {
  private storage: CloudStorage.Storage;

  constructor() {
    this.storage = CloudStorage({
      projectId: 'finspect-backend-prod',
      keyFilename: 'gcloud-api-key.json',
    });
  }

  public async uploadStream(stream: Readable, bucketName: string, filename?: string) {
    filename = filename || stream['hapi'].filename;
    const extension = filename.split('.').pop();
    const [accountantId, companyId] = bucketName.split('-');

    const bucket: CloudStorage.Bucket = (await this.storage.bucket(bucketName).get({ autoCreate: true }))[0];
    let size = 0;
    const hash = uuid(bucketName, uuid.URL);
    const file = bucket.file(`${hash}/${filename}`);
    const writeStream = file.createWriteStream({ public: true });
    stream.pipe(writeStream);

    return new Promise((resolve, reject) => {
      stream.on('data', chunk => size += chunk.length);
      stream.on('error', err => reject(err));
      writeStream.on('error', err => reject(new Error(err)));
      writeStream.on('finish', () => {
        resolve({
          accountantId,
          companyId,
          filename,
          originalFilename: `${hash}/${filename}`,
          url: `https://storage.googleapis.com/${bucketName}/${hash}/${filename}`,
          extension,
          size,
        });
      });
    });
  }

  public async uploadBuffer(buffer: Buffer, bucketName: string, filename: string) {
    const bucket: CloudStorage.Bucket = (await this.storage.bucket(bucketName).get({ autoCreate: true }))[0];
    const hash = uuid(bucketName, uuid.URL);
    const file = bucket.file(`${hash}/${filename}`);
    await file.save(buffer, {public: true});
    const metadata = (await file.getMetadata())[0];
    return {size: metadata.size, url: `https://storage.googleapis.com/${bucketName}/${hash}/${filename}`};
  }

  public deleteFile(file) {
    const f = this.storage.bucket(`${file.accountantId}-${file.companyId}`).file(file.originalFilename);
    return f.delete();
  }
}