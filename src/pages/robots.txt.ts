import type { APIRoute } from "astro";
import { buildRobotsTxt } from "../lib/robots";

export const GET: APIRoute = ({ site }) => {
  return new Response(buildRobotsTxt(site?.origin ?? "https://swageda.ru"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
