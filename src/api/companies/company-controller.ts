import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest, IArrayRequest } from "../../interfaces/request";
import UserController from "../users/user-controller";
import BalanceSheetUtils from "../../utils/balanceSheetUtils";

export default class CompanyController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private userController: UserController;
  private balanceSheetUtils: BalanceSheetUtils;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.userController = new UserController(configs, database);
    this.balanceSheetUtils = new BalanceSheetUtils(database);
  }

  public async createCompanies(request: IArrayRequest, h: Hapi.ResponseToolkit) {
    const companies = request.payload;
    const accountantId = request.auth.credentials.relatedToId;
    let user, response, newCompany;
    // check if there are duplicate user emails
    try {
      await Promise.all(companies.map(async (company) => {
        user = await this.database.userModel.findOne({ email: company.email });
        if (user) {
          throw new Error(`User ${user.email} already exists`);
        }
      }));
    } catch (error) {
      return Boom.badData(error);
    }
    // do the stuff
    try {
      response = await Promise.all(companies.map(async (company) => {
        company.accountantId = accountantId || company.accountantId;
        const accountant = await this.database.accountantModel.findOne({ _id: company.accountantId, isActive: true, deleted: false });
        if (!accountant) {
          return { error: true, msg: 'Accountant does not exist' };
        }
        const plan = await this.database.planModel.findById(accountant.planId);
        if (accountant.activeCompaniesCount >= plan.maxCompanies) {
          return { error: true, msg: 'Number of companies exceeded, please upgrade your plan' };
        }
        const marketSegment = await this.database.marketSegmentModel.findOne({ _id: company.marketSegmentId, industryId: company.industryId, deleted: false });
        if (!marketSegment) {
          return { error: true, msg: 'Market segment not found' };
        }
        try {
          newCompany = await this.database.companyModel.create(company);
        } catch (error) {
          return { error: true, msg: 'Could not create company' };
        }
        user = {
          email: company.email,
          password: company.password,
          name: newCompany.contactName,
          roles: ['company', `company-${newCompany._id}`],
          relatedTo: 'company',
          relatedToId: newCompany._id
        };
        try {
          await this.database.userModel.create(user);
        } catch (error) {
          newCompany.remove();
          return { error: true, msg: 'Could not create user' };
        }
        if (newCompany.isActive) {
          accountant.activeCompaniesCount += 1;
          accountant.save();
        }
        return newCompany;
      }));
    } catch (error) {
      return Boom.badImplementation(error);
    }
    return h.response(response).code(201);
  }

  public async listCompanies(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.auth.credentials.scope.indexOf('company') > -1 ? request.auth.credentials.relatedToId : request.params.id;
    const accountantId = request.auth.credentials.scope.indexOf('accountant') > -1 ? request.auth.credentials.relatedToId : null;
    try {
      if (id) {
        let company;

        if (accountantId) {
          company = await this.database.companyModel.findOne({ _id: id, accountantId, deleted: false }).lean(true);
        } else {
          company = await this.database.companyModel.findOne({ _id: id, deleted: false }).lean(true);
        }

        if (!company) { return Boom.notFound(`Company ${id} does not exist`); }

        const user = await this.userController.getUserByRelatedToId(company._id);
        company['email'] = user.email;
        company['isStandardized'] = await this.balanceSheetUtils.isStandardized(accountantId, company['_id']);

        return h.response(company).code(200);
      }

      let companies;
      if (accountantId) {
        companies = await this.database.companyModel.find({ accountantId, deleted: false }).lean(true);
      } else {
        companies = await this.database.companyModel.find({ deleted: false }).lean(true);
      }

      companies = await Promise.all(companies.map(async company => {
        try {
          const user = await this.userController.getUserByRelatedToId(company._id);
          company['email'] = user.email;
          company['isStandardized'] = await this.balanceSheetUtils.isStandardized(accountantId, company['_id']);
        } catch (error) {
          return { error: error };
        }
        return company;
      }));

      return h.response(companies).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async toggleCompany(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    const accountantId = request.auth.credentials.scope.indexOf('accountant') > -1 ? request.auth.credentials.relatedToId : null;
    try {
      let company;
      if (accountantId) {
        company = await this.database.companyModel.findOne({ _id: id, accountantId, deleted: false });
      } else {
        company = await this.database.companyModel.findOne({ _id: id, deleted: false });
      }
      if (!company) { return Boom.notFound(`Company ${id} does not exist`); }
      const accountant = await this.database.accountantModel.findById(company.accountantId);
      if (!company.isActive) {
        const plan = await this.database.planModel.findById(accountant.planId);
        if (accountant.activeCompaniesCount + 1 > plan.maxCompanies) {
          return Boom.paymentRequired(`You cant activate more than ${plan.maxCompanies} companies`);
        }
      }
      accountant.activeCompaniesCount = company.isActive ? accountant.activeCompaniesCount -= 1 : accountant.activeCompaniesCount += 1;
      company.isActive = !company.isActive;
      accountant.save();
      company.save();
      return h.response(company).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editCompany(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    const accountantId = request.payload['accountantId'];
    try {
      const company = await this.database.companyModel.findOneAndUpdate({ _id: id, accountantId, deleted: false, isActive: true }, request.payload, { new: true });
      if (!company) { return Boom.notFound(`Company ${id} does not exist`); }
      this.userController.updateUserByRelatedToId(id, { email: request.payload['email'], password: request.payload['password'] });
      return h.response(company).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteCompany(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    const accountantId = request.auth.credentials.scope.indexOf('accountant') > -1 ? request.auth.credentials.relatedToId : null;
    try {
      let company;
      if (accountantId) {
        company = await this.database.companyModel.findOneAndUpdate({ _id: id, accountantId, deleted: false }, { $set: { deleted: true } }, { new: true });
      } else {
        company = await this.database.companyModel.findOneAndUpdate({ _id: id, deleted: false }, { $set: { deleted: true } }, { new: true });
      }
      if (!company) { return Boom.notFound(`Company ${id} does not exist`); }
      await this.database.accountantModel.findByIdAndUpdate(company.accountantId, { $inc: { activeCompaniesCount: -1 } });
      return h.response(company).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}
