import { Router, Request, Response, RouterOptions } from "express";

const router:Router = Router();

router.get('/', (req:Request, res:Response) => {
    res.json({ okay: true });
});
router.post('/', (req:Request, res:Response) => {
    res.json({ okay: true, postBody: req.body });
});
router.put('/', (req:Request, res:Response) => {
    res.json({ okay: true, putBody: req.body });
});
router.delete('/', (req:Request, res:Response) => {
    res.json({ okay: true, deleted: true });
});

export const TemplateRouter: Router = router;