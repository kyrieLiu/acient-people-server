/**
 * author Liu Yin
 * date 2020/6/21
 * Description:
 */

import Koa from 'koa';
const bodyParser = require('koa-bodyparser');
import cors from 'koa2-cors';
import mongoose from 'mongoose';
import dbConfig from './dbs/config';
import verifyUser from './utils/verify';
import fs from 'fs';
import path from 'path';

const app = new Koa();
const koaStatic = require('koa-static');

const koaBody = require('koa-body');

import logger from '../logs/log4';

import resFormat from './utils/res-format';

app.use(koaBody({
  multipart: true,
  formidable: {
    maxFileSize: 200 * 1024 * 1024 // 设置上传文件大小最大限制，默认200M
  }
}));

app.use(bodyParser({
  extendTypes: ['json', 'form', 'text']
}));
mongoose.connect(dbConfig.dbs, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
app.use(cors());

// 配置静态web服务的中间件
const staticPath = path.join(__dirname, '../public');
app.use(koaStatic(staticPath));

// 验证用户信息
app.use(verifyUser());

app.use(async(ctx, next) => {
  const start = new Date().getTime();
  try {
    await next();
  } catch (e) {
    const path = `${ctx.request.method} ${ctx.request.url}  Time: ${new Date()}`;
    logger.error(path);
    logger.error(e);
    resFormat.error(ctx, e.message);
  }
  const ms = new Date().getTime() - start;
  console.log(`${ctx.request.method} ${ctx.request.url}: ${ms}ms`);
  ctx.response.set('X-Response-Time', `${ms}ms`);
});

const dir = path.join(__dirname, './routes');
// 配置接口路径
const interfaceArr = fs.readdirSync(dir);
interfaceArr.forEach(item => {
  if (item === 'apidoc.js') {
    return;
  }
  const routeInstance = require('./routes/' + item);
  app.use(routeInstance.routes()).use(routeInstance.allowedMethods());
});

app.use(async(ctx, next) => {
  // await next();
  resFormat.custom(ctx, 404, { code: 404, msg: 'not found ' + ctx.request.path });
});

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3002;
app.listen(port, host);
logger.info(`Server listening on http://${host}:${port}`);
