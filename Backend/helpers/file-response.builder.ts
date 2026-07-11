import { IFileResponse } from '../interfaces/api.interfaces';

export class FileResponseBuilder {
  static build(buffer: Buffer, filename: string, contentType: string): IFileResponse {
    return { buffer, filename, contentType };
  }

  static pdf(buffer: Buffer, filename: string): IFileResponse {
    return this.build(buffer, filename, 'application/pdf');
  }

  static csv(buffer: Buffer, filename: string): IFileResponse {
    return this.build(buffer, filename, 'text/csv');
  }

  static xlsx(buffer: Buffer, filename: string): IFileResponse {
    return this.build(
      buffer,
      filename,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }
}
