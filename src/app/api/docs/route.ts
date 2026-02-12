// ─── OpenAPI 3.0 Specification Endpoint ─────────────────────────────────────
// Serves the CallDoc API specification at GET /api/docs.
// Used by the Swagger UI page at /api-docs.html.

import { NextResponse } from 'next/server';

function buildSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'CallDoc API',
      version: '1.0.0',
      description:
        'CallDoc is a self-hosted call center reporting platform for Avaya IP Office 11. ' +
        'This API provides access to real-time and historical call data, agent states, ' +
        'recordings, reports, wallboards, and administration functions.',
      contact: { name: 'CallDoc', url: 'https://github.com/calldoc' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: '/', description: 'Current instance' },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Calls', description: 'Call records and events' },
      { name: 'Agents', description: 'Agent status and timeline' },
      { name: 'Reports', description: 'Report generation and export' },
      { name: 'Recordings', description: 'Call recordings and playback' },
      { name: 'Wallboards', description: 'Real-time wallboard management' },
      { name: 'Admin', description: 'User, settings, and system administration' },
      { name: 'System', description: 'Health checks and system status' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'calldoc-session',
          description: 'Session cookie set after successful login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            hasMore: { type: 'boolean' },
          },
        },
        Call: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            direction: { type: 'string', enum: ['inbound', 'outbound', 'internal'] },
            state: { type: 'string', enum: ['idle', 'ringing', 'connected', 'hold', 'transferring', 'conferencing', 'queued', 'parked', 'voicemail', 'completed', 'abandoned'] },
            callerNumber: { type: 'string' },
            callerName: { type: 'string', nullable: true },
            calledNumber: { type: 'string' },
            calledName: { type: 'string', nullable: true },
            queueName: { type: 'string', nullable: true },
            agentExtension: { type: 'string', nullable: true },
            agentName: { type: 'string', nullable: true },
            startTime: { type: 'string', format: 'date-time' },
            answerTime: { type: 'string', format: 'date-time', nullable: true },
            endTime: { type: 'string', format: 'date-time', nullable: true },
            duration: { type: 'integer', description: 'Duration in seconds' },
            holdCount: { type: 'integer' },
            holdDuration: { type: 'integer' },
            transferCount: { type: 'integer' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        CallEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            callId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['initiated', 'queued', 'dequeued', 'ringing', 'answered', 'held', 'retrieved', 'transferred', 'conferenced', 'parked', 'unparked', 'voicemail', 'completed', 'abandoned', 'dtmf', 'recording_started', 'recording_stopped'] },
            timestamp: { type: 'string', format: 'date-time' },
            duration: { type: 'number', nullable: true },
            party: { type: 'string', nullable: true },
          },
        },
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            extension: { type: 'string' },
            name: { type: 'string' },
            state: { type: 'string', enum: ['idle', 'talking', 'ringing', 'hold', 'acw', 'dnd', 'away', 'logged-out', 'unknown'] },
            stateStartTime: { type: 'string', format: 'date-time' },
            stateDuration: { type: 'integer' },
            activeCallId: { type: 'string', nullable: true },
            groups: { type: 'array', items: { type: 'string' } },
          },
        },
        Recording: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            callId: { type: 'string', format: 'uuid' },
            agentName: { type: 'string', nullable: true },
            callerNumber: { type: 'string' },
            calledNumber: { type: 'string' },
            direction: { type: 'string', enum: ['inbound', 'outbound', 'internal'] },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            duration: { type: 'integer' },
            fileSize: { type: 'integer' },
            format: { type: 'string', enum: ['wav', 'opus'] },
          },
        },
        ReportTemplate: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['agent', 'call', 'group', 'trunk'] },
            style: { type: 'string', enum: ['summary', 'detail', 'distribution', 'timeline'] },
          },
        },
        ReportResult: {
          type: 'object',
          properties: {
            columns: { type: 'array', items: { type: 'object' } },
            rows: { type: 'array', items: { type: 'object' } },
            summary: { type: 'object' },
          },
        },
        Wallboard: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            theme: { type: 'string', enum: ['dark', 'light', 'custom'] },
            widgets: { type: 'array', items: { type: 'object' } },
            layouts: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'supervisor', 'agent', 'readonly'] },
            active: { type: 'boolean' },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
            version: { type: 'string' },
            uptime: { type: 'integer' },
            connections: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
                devlink3: { type: 'string' },
                smdr: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
    paths: {
      // ── Auth ──────────────────────────────────────────────────────────
      '/api/auth/local': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'admin@calldoc.local' },
                    password: { type: 'string', example: 'password' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful, session cookie set' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/{...saml}': {
        get: {
          tags: ['Auth'],
          summary: 'SAML 2.0 SSO flow',
          security: [],
          description: 'Handles SAML login redirect and callback. Routes: /api/auth/saml/login, /api/auth/saml/callback, /api/auth/saml/metadata',
          parameters: [{ name: 'saml', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '302': { description: 'Redirect to IdP or dashboard' } },
        },
      },

      // ── Calls ─────────────────────────────────────────────────────────
      '/api/calls': {
        get: {
          tags: ['Calls'],
          summary: 'List calls with pagination and filters',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'direction', in: 'query', schema: { type: 'string', enum: ['inbound', 'outbound', 'internal'] } },
            { name: 'state', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', default: 'startTime' } },
            { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          ],
          responses: {
            '200': { description: 'Paginated call list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
          },
        },
      },
      '/api/calls/{id}': {
        get: {
          tags: ['Calls'],
          summary: 'Get a single call by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Call record', content: { 'application/json': { schema: { $ref: '#/components/schemas/Call' } } } },
            '404': { description: 'Call not found' },
          },
        },
      },
      '/api/calls/{id}/events': {
        get: {
          tags: ['Calls'],
          summary: 'Get events (lifecycle timeline) for a call',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'List of call events', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CallEvent' } } } } },
          },
        },
      },
      '/api/calls/{id}/notes': {
        post: {
          tags: ['Calls'],
          summary: 'Add a note to a call',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } },
          },
          responses: { '201': { description: 'Note created' } },
        },
      },

      // ── Agents ────────────────────────────────────────────────────────
      '/api/agents': {
        get: {
          tags: ['Agents'],
          summary: 'List all agents with current state',
          parameters: [
            { name: 'state', in: 'query', schema: { type: 'string' } },
            { name: 'group', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Agent list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Agent' } } } } } },
        },
      },
      '/api/agents/{id}': {
        get: {
          tags: ['Agents'],
          summary: 'Get a single agent by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Agent record', content: { 'application/json': { schema: { $ref: '#/components/schemas/Agent' } } } },
            '404': { description: 'Agent not found' },
          },
        },
      },
      '/api/agents/{id}/timeline': {
        get: {
          tags: ['Agents'],
          summary: 'Get state timeline for an agent',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          ],
          responses: { '200': { description: 'Agent timeline entries' } },
        },
      },

      // ── Reports ───────────────────────────────────────────────────────
      '/api/reports': {
        get: {
          tags: ['Reports'],
          summary: 'List available report templates',
          responses: { '200': { description: 'Report template list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ReportTemplate' } } } } } },
        },
      },
      '/api/reports/generate': {
        post: {
          tags: ['Reports'],
          summary: 'Generate a report from a template',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['templateId', 'dateRange'],
                  properties: {
                    templateId: { type: 'string', example: 'agent-summary' },
                    dateRange: {
                      type: 'object',
                      properties: {
                        from: { type: 'string', format: 'date-time' },
                        to: { type: 'string', format: 'date-time' },
                      },
                    },
                    filters: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Generated report', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportResult' } } } },
            '400': { description: 'Invalid template or parameters' },
          },
        },
      },
      '/api/reports/{id}/export': {
        post: {
          tags: ['Reports'],
          summary: 'Export a report as CSV, XLSX, or PDF',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { format: { type: 'string', enum: ['csv', 'xlsx', 'pdf'] } } } } },
          },
          responses: { '200': { description: 'Exported file' } },
        },
      },
      '/api/reports/schedules': {
        get: {
          tags: ['Reports'],
          summary: 'List report schedules',
          responses: { '200': { description: 'Schedule list' } },
        },
        post: {
          tags: ['Reports'],
          summary: 'Create a report schedule',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '201': { description: 'Schedule created' } },
        },
      },

      // ── Recordings ────────────────────────────────────────────────────
      '/api/recordings': {
        get: {
          tags: ['Recordings'],
          summary: 'List recordings with filters',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'agent', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          ],
          responses: { '200': { description: 'Paginated recording list' } },
        },
      },
      '/api/recordings/{id}': {
        get: {
          tags: ['Recordings'],
          summary: 'Get recording metadata',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Recording metadata', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recording' } } } } },
        },
      },
      '/api/recordings/{id}/stream': {
        get: {
          tags: ['Recordings'],
          summary: 'Stream recording audio',
          description: 'Returns audio with Range header support for seeking.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Audio stream', content: { 'audio/ogg': {} } }, '206': { description: 'Partial audio content' } },
        },
      },
      '/api/recordings/{id}/notes': {
        post: {
          tags: ['Recordings'],
          summary: 'Add a note to a recording',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, timestamp: { type: 'number' } } } } } },
          responses: { '201': { description: 'Note created' } },
        },
      },
      '/api/recordings/{id}/score': {
        post: {
          tags: ['Recordings'],
          summary: 'Submit a QA scorecard for a recording',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '201': { description: 'Scorecard submitted' } },
        },
      },
      '/api/recordings/{id}/share': {
        post: {
          tags: ['Recordings'],
          summary: 'Create a shareable link for a recording',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { expiresInHours: { type: 'integer', default: 24 } } } } } },
          responses: { '201': { description: 'Share link created' } },
        },
      },

      // ── Wallboards ────────────────────────────────────────────────────
      '/api/wallboards': {
        get: {
          tags: ['Wallboards'],
          summary: 'List all wallboards',
          responses: { '200': { description: 'Wallboard list' } },
        },
        post: {
          tags: ['Wallboards'],
          summary: 'Create a new wallboard',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, theme: { type: 'string' } } } } } },
          responses: { '201': { description: 'Wallboard created' } },
        },
      },
      '/api/wallboards/{id}': {
        get: {
          tags: ['Wallboards'],
          summary: 'Get wallboard by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Wallboard configuration', content: { 'application/json': { schema: { $ref: '#/components/schemas/Wallboard' } } } } },
        },
        put: {
          tags: ['Wallboards'],
          summary: 'Update a wallboard',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '200': { description: 'Wallboard updated' } },
        },
        delete: {
          tags: ['Wallboards'],
          summary: 'Delete a wallboard',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '204': { description: 'Wallboard deleted' } },
        },
      },

      // ── Admin ─────────────────────────────────────────────────────────
      '/api/admin/users': {
        get: { tags: ['Admin'], summary: 'List all users', responses: { '200': { description: 'User list' } } },
        post: {
          tags: ['Admin'],
          summary: 'Create a new user',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' }, password: { type: 'string' } } } } } },
          responses: { '201': { description: 'User created' } },
        },
      },
      '/api/admin/users/{id}': {
        get: { tags: ['Admin'], summary: 'Get user by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User record' } } },
        put: { tags: ['Admin'], summary: 'Update a user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'User updated' } } },
        delete: { tags: ['Admin'], summary: 'Delete a user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'User deleted' } } },
      },
      '/api/admin/settings': {
        get: { tags: ['Admin'], summary: 'Get system settings', responses: { '200': { description: 'Settings object' } } },
        put: { tags: ['Admin'], summary: 'Update system settings', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Settings updated' } } },
      },
      '/api/admin/recording-rules': {
        get: { tags: ['Admin'], summary: 'List recording rules', responses: { '200': { description: 'Recording rule list' } } },
        post: { tags: ['Admin'], summary: 'Create a recording rule', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Rule created' } } },
      },
      '/api/admin/storage-pools': {
        get: { tags: ['Admin'], summary: 'List storage pools', responses: { '200': { description: 'Storage pool list' } } },
        post: { tags: ['Admin'], summary: 'Create a storage pool', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Pool created' } } },
      },
      '/api/admin/alerts': {
        get: { tags: ['Admin'], summary: 'List alert rules', responses: { '200': { description: 'Alert rule list' } } },
        post: { tags: ['Admin'], summary: 'Create an alert rule', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Alert created' } } },
      },
      '/api/admin/audit-log': {
        get: {
          tags: ['Admin'],
          summary: 'Query audit log entries',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'userId', in: 'query', schema: { type: 'string' } },
            { name: 'action', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Audit log entries' } },
        },
      },

      // ── System ────────────────────────────────────────────────────────
      '/api/health': {
        get: {
          tags: ['System'],
          summary: 'Health check endpoint',
          security: [],
          responses: {
            '200': { description: 'Service is healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthStatus' } } } },
            '503': { description: 'Service is unhealthy' },
          },
        },
      },
      '/api/devlink3/status': {
        get: {
          tags: ['System'],
          summary: 'DevLink3 connection status and stats',
          responses: { '200': { description: 'DevLink3 connector status' } },
        },
      },
    },
  };
}

export async function GET() {
  return NextResponse.json(buildSpec(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
