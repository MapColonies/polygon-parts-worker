import fs from 'fs';
import path from 'path';

export class TempCopier {
  public tempPath = path.resolve(__dirname, '../temp');

  public constructor() {}

  public copyToTemp(src: string, innerPath = ''): void {
    fs.cpSync(src, path.join(this.tempPath, innerPath), { recursive: true });
  }

  public disposeTemp(): void {
    fs.rmSync(this.tempPath, { recursive: true });
  }
}
