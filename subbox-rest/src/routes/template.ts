import { Router, Request, Response, RouterOptions } from "express";
import { emptyResponse } from "./utils";

/* ---- CONSTANTS / CONFIG VALUES ---- */
// TODO

/* ---- CLASSES & INTERFACES ---- */
// TODO

/* ---- PROCESSING FUNCTIONS ---- */
// TODO

/* ---- ROUTER ---- */
const router:Router = Router();

/** 
 * GET _/
 * Default Route (responds with 204 Empty Response to confirm that this router is loaded and working)
 * 
 * Returns:
 *  HTTP 204 No Content
 */
router.get('/', emptyResponse(false));

/* ---- ROUTER EXPORT (END OF FILE) ---- */
export const TemplateRouter: Router = router;