import { startTestServer, cleanDb } from './helpers';
import type { Agent } from 'supertest';

let api: Agent;
let closeServer: () => Promise<void>;

beforeAll(async () => {
  await cleanDb();
  const server = await startTestServer();
  api = server.api;
  closeServer = server.close;
});

afterAll(async () => {
  await closeServer();
  await cleanDb();
});

describe('POST /auth/register', () => {
  it('creates a user and returns token + username', async () => {
    const res = await api.post('/auth/register').send({
      username: 'alice',
      email: 'alice@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.username).toBe('alice');
  });

  it('rejects duplicate username', async () => {
    await api.post('/auth/register').send({
      username: 'bob',
      email: 'bob@test.com',
      password: 'password123',
    });
    const res = await api.post('/auth/register').send({
      username: 'bob',
      email: 'bob2@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects duplicate email', async () => {
    await api.post('/auth/register').send({
      username: 'carol',
      email: 'shared@test.com',
      password: 'password123',
    });
    const res = await api.post('/auth/register').send({
      username: 'carol2',
      email: 'shared@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects a username that is too short', async () => {
    const res = await api.post('/auth/register').send({
      username: 'ab',
      email: 'ab@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a password that is too short', async () => {
    const res = await api.post('/auth/register').send({
      username: 'dave',
      email: 'dave@test.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeAll(async () => {
    await api.post('/auth/register').send({
      username: 'loginuser',
      email: 'login@test.com',
      password: 'correctpassword',
    });
  });

  it('returns a token on valid credentials', async () => {
    const res = await api.post('/auth/login').send({
      email: 'login@test.com',
      password: 'correctpassword',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.username).toBe('loginuser');
  });

  it('rejects a wrong password', async () => {
    const res = await api.post('/auth/login').send({
      email: 'login@test.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email', async () => {
    const res = await api.post('/auth/login').send({
      email: 'nobody@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});
