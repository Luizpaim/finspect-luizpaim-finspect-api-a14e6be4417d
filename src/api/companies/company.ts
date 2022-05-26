import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface ICompany extends IDocumentBase {
    accountantId: string;
    name: string;
    cnpj: string;
    contactName: string;
    lastBalanceSheet: string;
    accountingSoftwareId: string;
    taxRegime: string; //ENUM
    industryId: string;
    marketSegmentId: string;
    isActive: boolean;
}

export const CompanySchema = new Mongoose.Schema(
    {
      accountantId: { type: Mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      cnpj: { type: String, required: true },
      contactName: { type: String, required: true },
      lastBalanceSheet: String,
      taxRegime: { type: String, enum: ['simples', 'mei', 'lucro_real', 'lucro_presumido'] },
      accountingSoftwareId: Mongoose.Schema.Types.ObjectId,
      industryId: Mongoose.Schema.Types.ObjectId,
      marketSegmentId: Mongoose.Schema.Types.ObjectId,
      isActive: { type: Boolean, default: true },
      //BASE SCHEMA
      deleted: { type: Boolean, default: false, select: false },
      createdAt: { type: Date, select: false},
      updatedAt: { type: Date, select: false },
      __v: { type: Number, select: false }
    },
    {
      timestamps: true
    }
);

export const CompanyModel = Mongoose.model<ICompany>("Company", CompanySchema);