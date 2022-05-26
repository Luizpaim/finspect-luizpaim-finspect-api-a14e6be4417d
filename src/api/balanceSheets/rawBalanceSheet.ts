import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IRawBalanceSheetAccount {
    code: string;
    level: number;
    name: string;
    previousBalance: number;
    debit: number;
    credit: number;
    currentBalance: number;
}

export interface IRawBalanceSheet extends IDocumentBase {
    accounts: IRawBalanceSheetAccount[];
    month: number;
    year: number;
    key: string; //09-2018
    companyId: string;
    accountantId: string;
    fileId: string;
}

export const RawBalanceSheetSchema = new Mongoose.Schema(
    {
        accounts: { type: Array, required: true },
        month: { type: Number, required: true },
        year: { type: Number, required: true },
        key: { type: String, required: true },
        companyId: { type: Mongoose.Schema.Types.ObjectId, required: true},
        accountantId: { type: Mongoose.Schema.Types.ObjectId, required: true},
        fileId: Mongoose.Schema.Types.ObjectId,
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

export const RawBalanceSheetModel = Mongoose.model<IRawBalanceSheet>("RawBalanceSheet", RawBalanceSheetSchema);