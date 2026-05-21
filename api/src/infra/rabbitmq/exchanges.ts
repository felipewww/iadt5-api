import * as RabbitMQ from "src/infra/framework/rabbitmq/module";

interface IExchanges extends RabbitMQ.IExchangesDefinitions {
    EXC_SAMPLE: RabbitMQ.Exchange;
    EXC_AUTH_SECRET: RabbitMQ.Exchange;
    EXC_NOTIFICATIONS: RabbitMQ.Exchange;
    EXC_OCR: RabbitMQ.Exchange;
}

export const Exchanges: IExchanges = {
    EXC_SAMPLE: new RabbitMQ.Exchange('exc-sample'),
    EXC_AUTH_SECRET: new RabbitMQ.Exchange('exc-auth-secret'),
    EXC_NOTIFICATIONS: new RabbitMQ.Exchange('exc-notifications'),
    EXC_OCR: new RabbitMQ.Exchange('exc-ocr'),
};
