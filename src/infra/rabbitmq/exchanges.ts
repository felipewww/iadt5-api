import * as RabbitMQ from "src/infra/framework/rabbitmq/module";

interface IExchanges extends RabbitMQ.IExchangesDefinitions {
    EXC_SAMPLE: RabbitMQ.Exchange;
    EXC_IAM_GROUP_PERMISSIONS: RabbitMQ.Exchange;
}

export const Exchanges: IExchanges = {
    EXC_SAMPLE: new RabbitMQ.Exchange('exc-sample'),
    EXC_IAM_GROUP_PERMISSIONS: new RabbitMQ.Exchange('exc-iam-group-permissions'),
};
