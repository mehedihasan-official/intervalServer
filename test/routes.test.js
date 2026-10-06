const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const database = require('../config/database');

const collections = {
  users: [],
  AllResorts: Array.from({ length: 501 }, (_, id) => ({ id, name: `Resort ${id}` })),
  allBookings: [],
};
let nextId = 1;

database.getDatabase = async () => ({
  collection(name) {
    const documents = collections[name];

    return {
      find(filter = {}) {
        let limit = Infinity;
        const cursor = {
          limit(value) {
            limit = value;
            return cursor;
          },
          async toArray() {
            return documents
              .filter((document) => Object.entries(filter).every(([key, value]) => document[key] === value))
              .slice(0, limit);
          },
        };
        return cursor;
      },
      async findOne(filter) {
        return documents.find((document) =>
          Object.entries(filter).every(([key, value]) => document[key] === value)
        ) || null;
      },
      async insertOne(document) {
        const insertedId = `${name}-${nextId++}`;
        documents.push({ ...document, _id: insertedId });
        return { acknowledged: true, insertedId };
      },
      async updateOne(filter, update) {
        const document = documents.find((entry) =>
          Object.entries(filter).every(([key, value]) => entry[key] === value)
        );
        if (!document) return { matchedCount: 0, modifiedCount: 0 };
        Object.assign(document, update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      },
    };
  },
});

const app = require('../app');

test('API routes', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options) => {
    const response = await fetch(`${baseUrl}${path}`, options);
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    return { response, body };
  };
  const json = (method, body) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await t.test('health and unknown routes', async () => {
    const health = await request('/');
    assert.equal(health.response.status, 200);
    assert.equal(health.body, 'Interval Server is running');

    const malformedJson = await request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":',
    });
    assert.equal(malformedJson.response.status, 400);
    assert.deepEqual(malformedJson.body, { message: 'Request body must be valid JSON' });

    const missing = await request('/not-a-route');
    assert.equal(missing.response.status, 404);
    assert.deepEqual(missing.body, { message: 'Route not found' });
  });

  await t.test('user routes', async () => {
    const allBefore = await request('/all-users');
    assert.equal(allBefore.response.status, 200);
    assert.deepEqual(allBefore.body, []);

    const invalid = await request('/users', json('POST', { name: 'No email' }));
    assert.equal(invalid.response.status, 400);

    const missingEmail = await request('/users');
    assert.equal(missingEmail.response.status, 400);

    const missingUser = await request('/users/email=unknown%40example.com');
    assert.equal(missingUser.response.status, 404);

    const created = await request('/users', json('POST', {
      name: '  Test User  ',
      email: 'Test.User@Example.com',
    }));
    assert.equal(created.response.status, 201);
    assert.equal(created.body.message, 'User successfully added');
    assert.ok(created.body.userId);

    const duplicate = await request('/users', json('POST', {
      name: 'Duplicate',
      email: 'test.user@example.com',
    }));
    assert.equal(duplicate.response.status, 409);

    const byQuery = await request('/users?email=TEST.USER%40EXAMPLE.COM');
    assert.equal(byQuery.response.status, 200);
    assert.equal(byQuery.body.name, 'Test User');
    assert.equal(byQuery.body.email, 'test.user@example.com');

    const byPath = await request('/users/email=TEST.USER%40EXAMPLE.COM');
    assert.equal(byPath.response.status, 200);
    assert.equal(byPath.body.email, 'test.user@example.com');

    const invalidRole = await request('/update-user', json('PATCH', {
      email: 'test.user@example.com',
      isAdmin: 'true',
    }));
    assert.equal(invalidRole.response.status, 400);

    const updatedRole = await request('/update-user', json('PATCH', {
      email: 'TEST.USER@EXAMPLE.COM',
      isAdmin: true,
    }));
    assert.equal(updatedRole.response.status, 200);
    assert.equal(updatedRole.body.email, 'test.user@example.com');
    assert.equal(updatedRole.body.isAdmin, true);

    const missingRoleUser = await request('/update-user', json('PATCH', {
      email: 'missing@example.com',
      isAdmin: true,
    }));
    assert.equal(missingRoleUser.response.status, 404);

    const invalidInfo = await request('/update-user-info', json('PATCH', { age: 30 }));
    assert.equal(invalidInfo.response.status, 400);

    const updatedInfo = await request('/update-user-info', json('PATCH', {
      email: 'TEST.USER@EXAMPLE.COM',
      age: 30,
      securityDeposit: 100,
      idNumber: 'ID-123',
    }));
    assert.equal(updatedInfo.response.status, 200);
    assert.equal(updatedInfo.body.success, true);

    const allAfter = await request('/all-users');
    assert.equal(allAfter.response.status, 200);
    assert.equal(allAfter.body.length, 1);
    assert.equal(allAfter.body[0].age, 30);
  });

  await t.test('resort routes', async () => {
    const invalid = await request('/add-resort', json('POST', []));
    assert.equal(invalid.response.status, 400);

    const created = await request('/add-resort', json('POST', { name: 'New Resort' }));
    assert.equal(created.response.status, 201);
    assert.equal(created.body.message, 'Resort data successfully added');

    const startedAt = Date.now();
    const resorts = await request('/resort-data');
    const elapsed = Date.now() - startedAt;
    assert.equal(resorts.response.status, 200);
    assert.equal(resorts.body.length, 500);
    assert.ok(elapsed >= 9_900, `Resort response arrived too early: ${elapsed}ms`);
  });

  await t.test('booking routes', async () => {
    const invalid = await request('/bookings', json('POST', []));
    assert.equal(invalid.response.status, 400);

    const firstBooking = await request('/bookings', json('POST', {
      email: 'BOOKER@EXAMPLE.COM',
      resort: 'Test Resort',
    }));
    assert.equal(firstBooking.response.status, 201);
    assert.ok(firstBooking.body.insertedId);

    const secondBooking = await request('/bookings', json('POST', {
      email: 'other@example.com',
      resort: 'Other Resort',
    }));
    assert.equal(secondBooking.response.status, 201);

    const missingEmail = await request('/bookings');
    assert.equal(missingEmail.response.status, 400);

    const byEmail = await request('/bookings?email=Booker%40Example.com');
    assert.equal(byEmail.response.status, 200);
    assert.equal(byEmail.body.length, 1);
    assert.equal(byEmail.body[0].email, 'booker@example.com');

    const noBookings = await request('/bookings?email=missing%40example.com');
    assert.equal(noBookings.response.status, 404);

    const allBookings = await request('/all-bookings');
    assert.equal(allBookings.response.status, 200);
    assert.equal(allBookings.body.length, 2);
  });
});
