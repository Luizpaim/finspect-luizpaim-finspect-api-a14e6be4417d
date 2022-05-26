import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IBalanceSheetAccount {
    code: string;
    level: number;
    name: string;
    description: string;
    previousBalance: number;
    debit: number;
    credit: number;
    currentBalance: number;
}

export interface IBalanceSheet extends IDocumentBase {
    accounts: IBalanceSheetAccount[];
    month: number;
    year: number;
    key: string; //09-2018
    companyId: string;
    accountantId: string;
    rawId: string;
}

export const BalanceSheetSchema = new Mongoose.Schema(
    {
        accounts: { type: Array, required: true },
        month: { type: Number, required: true },
        year: { type: Number, required: true },
        key: { type: String, required: true },
        companyId: { type: Mongoose.Schema.Types.ObjectId, required: true},
        accountantId: { type: Mongoose.Schema.Types.ObjectId, required: true},
        rawId: Mongoose.Schema.Types.ObjectId,
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

export const BalanceSheetModel = Mongoose.model<IBalanceSheet>("BalanceSheet", BalanceSheetSchema);