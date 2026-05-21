import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';

interface IExchanges extends RabbitMQ.IExchangesDefinitions {
    EXC_ANALYZER: RabbitMQ.Exchange;
}

export const Exchanges: IExchanges = {
    EXC_ANALYZER: new RabbitMQ.Exchange('exc-analyzer'),
};
