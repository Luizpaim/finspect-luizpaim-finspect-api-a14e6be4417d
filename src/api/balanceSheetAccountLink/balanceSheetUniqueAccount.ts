import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IBalanceSheetUniqueAccount extends IDocumentBase {
    code: string;
    name: string;
    level: string;
    companyId: string;
    internalAccountCode: string;
}

export const BalanceSheetUniqueAccountSchema = new Mongoose.Schema(
    {
        code: { type: String, required: true},
        level: Number,
        name: { type: String, required: true},
        accountantId: { type: Mongoose.Schema.Types.ObjectId, required: true},
        companyId: { type: Mongoose.Schema.Types.ObjectId, required: true},
        internalAccountCode: String,
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

export const BalanceSheetUniqueAccountModel = Mongoose.model<IBalanceSheetUniqueAccount>("BalanceSheetUniqueAccount", BalanceSheetUniqueAccountSchema);