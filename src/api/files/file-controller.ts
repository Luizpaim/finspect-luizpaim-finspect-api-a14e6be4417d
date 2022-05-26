import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import GCSController from "../../utils/googleCloudStorage";
import { ICompany } from "../companies/company";
import { Readable } from "stream";
import { IFileResult } from "../../interfaces/file";

export default class FileController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private storage: GCSController;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.storage = new GCSController();
  }

  public async createXLSXFile(stream: Readable, filename: string, company: ICompany): Promise<IFileResult> {
    try {
      const file = await <Object> this.storage.uploadStream(stream, `${company.accountantId}-${company._id}`, `${filename}.xlsx`);
      if (!file) {
        throw new Error("Could not upload file");
      }

      file['type'] = 'xlsx';
      await this.database.fileModel.create(file);

      return { filename, isError: false, result: file };
    } catch (error) {
      return { filename, isError: true, error: error.toString() };
    }
  }

  public async uploadFiles(request: IRequest, h: Hapi.ResponseToolkit) {
    const accountantId = request.params.accountantId;
    const companyId = request.params.companyId;

    try {
      const company = await this.database.companyModel.findOne({ _id: companyId, accountantId, deleted: false, isActive: true });
      if (!company) { return Boom.notFound(`Company ${companyId} is not active or does not exist`); }
      const files = (<any>Object).values(request.payload);
      const response: Array<IFileResult> = await Promise.all(files.map(async stream =>  {
        try {
          const file = await this.storage.uploadStream(stream, `${accountantId}-${companyId}`);
          if (!file) {
            throw new Error("Could not upload file");
          }
          file['type'] = 'common';
          await this.database.fileModel.create(file);
          return { filename: stream['hapi'].filename, isError: false, result: file };
        } catch (error) {
          return { filename: stream['hapi'].filename, isError: true, error: error.toString() };
        }
      }));

      if (response.every(file => file.isError)) {
        const allErrors = response.reduce((acc, { error }) => `${acc}\n${error}`, '');

        return Boom.badImplementation(allErrors);
      }

      return h.response(response).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async registerReport(request: IRequest, h: Hapi.ResponseToolkit) {
    const accountantId = request.params.accountantId;
    const companyId = request.params.companyId;
    try {
      await this.database.fileModel.create({ accountantId, companyId, type: 'report', ...request.payload as {} });
      return h.response().code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listFiles(request: IRequest, h: Hapi.ResponseToolkit) {
    const accountantId = request.params.accountantId;
    const companyId = request.params.companyId;
    try {
      const company = await this.database.companyModel.findOne({ _id: companyId, accountantId, deleted: false, isActive: true });
      if (!company) { return Boom.notFound(`Company ${companyId} is not active or does not exist`); }

      const files = await this.database.fileModel.find({ accountantId, companyId, deleted: false });
      return h.response(files).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async removeFile(request: IRequest, h: Hapi.ResponseToolkit) {
    const accountantId = request.params.accountantId;
    const companyId = request.params.companyId;
    try {
      await this.deleteFile(request.params.id, { accountantId, companyId });
      return h.response().code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteFile(id: string, opts: any) {
    const { accountantId, companyId } = opts;
    const file = await this.database.fileModel.findOneAndUpdate({ accountantId, companyId, _id: id }, { deleted: true });
    try {
      await this.storage.deleteFile(file);
    } catch (error) {
      console.log(error);
    }
  }
}