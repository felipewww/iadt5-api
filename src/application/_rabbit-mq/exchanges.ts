import * as RabbitMQ from "src/infra/framework/rabbitmq/module";

interface IExchanges extends RabbitMQ.IExchangesDefinitions {
  EXC_SAMPLE: RabbitMQ.Exchange,
}

export const Exchanges: IExchanges = {
    EXC_SAMPLE: new RabbitMQ.Exchange('exc-sample'),
};
