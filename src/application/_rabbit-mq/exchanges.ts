import * as RabbitMQ from "src/infra/framework/rabbitmq/module";

interface IExchanges extends RabbitMQ.IExchangesDefinitions {
  TENANT_SECRET: RabbitMQ.Exchange,
}

export const Exchanges: IExchanges = {
  TENANT_SECRET: new RabbitMQ.Exchange('tenant-secret-exc'),
}
