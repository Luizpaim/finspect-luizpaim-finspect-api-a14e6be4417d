import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IIndicator extends IDocumentBase {
  name: string;
  description: string;
  formula: string;
}

export const IndicatorSchema = new Mongoose.Schema(
  {
    name: String,
    description: String,
    formula: String,
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

export const IndicatorModel = Mongoose.model<IIndicator>('Indicator', IndicatorSchema);