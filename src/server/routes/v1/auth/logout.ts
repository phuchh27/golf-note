import { defineEventHandler, getCookie, setCookie } from "h3";

import { SessionService } from "../../../modules/identity";

const sessionService = new SessionService();

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "golf_note_session");

  if (token) {
    await sessionService.revokeSession(token);
  }

  setCookie(event, "golf_note_session", "", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return {
    success: true,
  };
});
