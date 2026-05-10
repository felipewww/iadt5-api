import {Handler} from "@/infra/framework/handler";
import {LoginCommand} from "@/domain/dtos/auth/commands/login.command";
import {LoginOutput} from "@/domain/dtos/auth/commands/login.output";

export class LoginHandler implements Handler<LoginCommand, LoginOutput> {
    constructor() {

    }

    execute(input: LoginCommand): Promise<LoginOutput> {
        throw new Error("Method not implemented.");
    }
}
