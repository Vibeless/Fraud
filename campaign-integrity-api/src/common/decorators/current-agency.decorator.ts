import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AgencyContext } from "../context/agency-context";

/**
 * Convenience param decorator: `@CurrentAgency() ctx: AgencyContext` in a
 * controller method. Just pulls the request-scoped AgencyContext out of
 * the module's DI container via the request; the actual population
 * happens in the guards, not here.
 */
export const CurrentAgency = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AgencyContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.agencyContext as AgencyContext;
  },
);
