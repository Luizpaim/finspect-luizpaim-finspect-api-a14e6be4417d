import * as Mongoose from "mongoose";
import { IDataConfiguration } from "./configurations";
import { ILogging, LoggingModel } from "./plugins/logging/logging";
import { IUser, UserModel } from "./api/users/user";
import { ISession, SessionModel } from "./session/session";
import { CompanyModel, ICompany } from "./api/companies/company";
import { AccountantModel, IAccountant } from "./api/accountants/accountant";
import { PlanModel, IPlan } from "./api/plans/plan";
import { IndustryModel, IIndustry } from "./api/industries/industry";
import { MarketSegmentModel, IMarketSegment } from "./api/marketSegments/marketSegment";
import { AccountingSoftwareModel, IAccountingSoftware } from "./api/accountingSoftwares/accountingSoftware";
import { RawBalanceSheetModel, IRawBalanceSheet } from "./api/balanceSheets/rawBalanceSheet";
import { BalanceSheetAccountModel, IBalanceSheetAccount } from './api/balanceSheetsAccounts/balanceSheetAccount';
import { BalanceSheetModel, IBalanceSheet } from "./api/balanceSheets/balanceSheet";
import { CreditCardModel, ICreditCard } from "./api/accountants/creditCard";
import { FileModel, IFile } from "./api/files/file";
import { BalanceSheetUniqueAccountModel, IBalanceSheetUniqueAccount } from './api/balanceSheetAccountLink/balanceSheetUniqueAccount';
import { IndicatorModel, IIndicator } from './api/indicators/indicator';
import { SituationModel, ISituation } from './api/situations/situation';

export interface IDatabase {
  loggingModel: Mongoose.Model<ILogging>;
  userModel: Mongoose.Model<IUser>;
  sessionModel: Mongoose.Model<ISession>;
  companyModel: Mongoose.Model<ICompany>;
  accountantModel: Mongoose.Model<IAccountant>;
  planModel: Mongoose.Model<IPlan>;
  industryModel: Mongoose.Model<IIndustry>;
  marketSegmentModel: Mongoose.Model<IMarketSegment>;
  accountingSoftwareModel: Mongoose.Model<IAccountingSoftware>;
  rawBalanceSheetModel: Mongoose.Model<IRawBalanceSheet>;
  balanceSheetAccountModel: Mongoose.Model<IBalanceSheetAccount>;
  balanceSheetModel: Mongoose.Model<IBalanceSheet>;
  creditCardModel: Mongoose.Model<ICreditCard>;
  fileModel: Mongoose.Model<IFile>;
  balanceSheetUniqueAccountModel: Mongoose.Model<IBalanceSheetUniqueAccount>;
  indicatorModel: Mongoose.Model<IIndicator>;
  situationModel: Mongoose.Model<ISituation>;
}

export function init(config: IDataConfiguration): IDatabase {
  (<any>Mongoose).Promise = Promise;
  Mongoose.connect("mongodb+srv://finspect-development:development@cluster0.6dkvq.mongodb.net/finspect-dev");

  let mongoDb = Mongoose.connection;

  mongoDb.on("error", () => {
    console.log(`Unable to connect to database.`);
  });

  mongoDb.once("open", () => {
    console.log(`Connected to database.`);
  });

  return {
    loggingModel: LoggingModel,
    userModel: UserModel,
    sessionModel: SessionModel,
    companyModel: CompanyModel,
    accountantModel: AccountantModel,
    planModel: PlanModel,
    industryModel: IndustryModel,
    marketSegmentModel: MarketSegmentModel,
    accountingSoftwareModel: AccountingSoftwareModel,
    rawBalanceSheetModel: RawBalanceSheetModel,
    balanceSheetAccountModel: BalanceSheetAccountModel,
    balanceSheetModel: BalanceSheetModel,
    creditCardModel: CreditCardModel,
    fileModel: FileModel,
    balanceSheetUniqueAccountModel: BalanceSheetUniqueAccountModel,
    indicatorModel: IndicatorModel,
    situationModel: SituationModel,
  };
}
