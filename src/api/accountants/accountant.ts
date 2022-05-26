import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IAddress {
    street: string;
    street_number: string;
    neighborhood: string;
    zipcode: string;
}

export interface IPhone {
    ddd: string;
    number: string;
}

export interface IAccountant extends IDocumentBase {
    name: string;
    cnpj: string;
    planId: string;
    activeCompaniesCount: number;
    logo: string;
    address: IAddress;
    phone: IPhone;
    subscriptionId: number;
    isActive: boolean;
    useDefaultLogo: boolean;
    paymentMethodId: string;
}

export const AccountantSchema = new Mongoose.Schema(
    {
        name: { type: String, required: true },
        cnpj: String,
        planId: Mongoose.Schema.Types.ObjectId,
        address: Object,
        phone: Object,
        activeCompaniesCount: {type: Number, default: 0},
        logo: String,
        subscriptionId: Number,
        isActive: { type: Boolean, default: true },
        useDefaultLogo: { type: Boolean, default: true },
        paymentMethodId: Mongoose.Schema.Types.ObjectId,
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

export const AccountantModel = Mongoose.model<IAccountant>("Accountant", AccountantSchema);