import { defineEventHandler } from 'h3';

import {
  IdentityService,
  SessionService,
} from '../../../modules/identity';

import { createLoginHandler } from './login.handler';

const identityService =
  new IdentityService();

const sessionService =
  new SessionService();

export default defineEventHandler(
  createLoginHandler(
    identityService,
    sessionService,
  ),
);