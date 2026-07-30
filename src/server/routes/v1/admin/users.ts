import { defineEventHandler } from "h3";

import { IdentityService, SessionService } from "../../../modules/identity";

import { createCreateUserHandler } from "./create-user.handler";

const identityService = new IdentityService();
const sessionService = new SessionService();

export default defineEventHandler(
  createCreateUserHandler(identityService, sessionService),
);
