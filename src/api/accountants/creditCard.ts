import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";
import { IAddress } from './accountant';

export interface ICreditCard extends IDocumentBase {
  accountantId: string;
  cardId: string;
  cardLastDigits: string;
  cardBrand: string;
  cardExpirationDate: string;
  address: IAddress;
}

export const CreditCardSchema = new Mongoose.Schema(
  {
    accountantId: { type: Mongoose.Schema.Types.ObjectId, required: true },
    cardId: { type: String, unique: true, required: true },
    cardLastDigits: String,
    cardBrand: String,
    cardExpirationDate: String,
    address: Object,
    //BASE SCHEMA
    deleted: { type: Boolean, default: false, select: false },
    createdAt: { type: Date, select: false },
    updatedAt: { type: Date, select: false },
    __v: { type: Number, select: false }
  },
  {
    timestamps: true
  }
);

export const CreditCardModel = Mongoose.model<ICreditCard>("CreditCard", CreditCardSchema);
