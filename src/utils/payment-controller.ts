import * as pagarme from 'pagarme';

export default class PaymentController {
  private client: any;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PAGARME_API_KEY || 'ak_live_ypq5WnMej9I3CtuRoNlO3cHeoyqLkm';
  }

  private async connect() {
    if (!this.client) {
      this.client = await pagarme.client.connect({ api_key: this.apiKey });
    }
  }

  public async createPlan(planDetails) {
    await this.connect();
    const payment_methods = planDetails.days === 365 ? [ 'credit_card', 'boleto' ] : ['credit_card'];
    return await this.client.plans.create({
      amount: planDetails.value * 100,
      days: planDetails.days,
      name: planDetails.name,
      trial_days: 0,
      payment_methods,
    });
  }

  public async updatePlan(planDetails) {
    await this.connect();
    return await this.client.plans.update({
      id: planDetails.pagarmeId,
      name: planDetails.name,
    });
  }

  public async saveCard(cardDetails) {
    await this.connect();
    return await this.client.cards.create({
      card_number: cardDetails.number,
      card_expiration_date: cardDetails.expirationDate,
      card_cvv: cardDetails.cvv,
      card_holder_name: cardDetails.holderName,
    });
  }

  public async subscribe(planId: number, costumerInfo: any, cardId?: string, card?: {
    card_number: string,
    card_cvv: string,
    card_holder_name: string,
    card_expiration_date: string,
  }) {
    await this.connect();

    const payload = {
      plan_id: planId,
      customer: {
        ...costumerInfo,
      },
      payment_method: cardId ? 'credit_card' : 'boleto',
      card_id: cardId,
      ...card,
      postback_url: process.env.PAGARME_WEBHOOK
    };
    return await this.client.subscriptions.create(payload);
  }

  public async unsubscribe(subscriptionId) {
    await this.connect();
    return await this.client.subscriptions.cancel({
      id: subscriptionId
    });
  }

  public async changePaymentMethod(subscriptionId, cardId?) {
    await this.connect();
    return await this.client.subscriptions.update({
      id: subscriptionId,
      payment_method: cardId ? 'credit_card' : 'boleto',
      card_id: cardId,
    });
  }

  public async validatePostback(request: any) {
    await this.connect();
    const payload = request.payload.toString();
    const signature = request.headers['x-hub-signature'].split('=')[1] || request.headers['x-hub-signature'];
    return this.client.security.verify(payload, signature);
  }

  public async getSubscriptionInfo(subscriptionId) {
    await this.connect();

    return this.client.subscriptions.find({ id: subscriptionId });
  }

  public async listTransactions() {
    await this.connect();

    return await this.client.transactions.all();
  }
}
