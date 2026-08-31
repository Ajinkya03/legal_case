export const openApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Legal Case MIS API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@example.com' },
                  password: { type: 'string', format: 'password', example: 'Password123!' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                            role: { type: 'string', enum: ['super_admin', 'admin', 'user'] },
                            permissions: { type: 'array', items: { type: 'string' } }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Authenticated user returned' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@example.com' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Password reset instructions sent' },
          '400': { description: 'Invalid email' }
        }
      }
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string', example: 'jwt_reset_token' },
                  password: { type: 'string', format: 'password', example: 'NewPassword123!' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Password reset successful' },
          '401': { description: 'Invalid or expired reset token' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        responses: { '200': { description: 'Token refreshed' } }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout the current user',
        responses: { '200': { description: 'Logged out' } }
      }
    },
    '/users/admin': {
      post: {
        tags: ['Users'],
        summary: 'Create one or many admin users (Super Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              oneOf: [
                {
                  type: 'object',
                  required: ['name', 'username', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Jane Admin' },
                    username: { type: 'string', example: 'janeadmin' },
                    email: { type: 'string', format: 'email', example: 'janeadmin@example.com' },
                    password: { type: 'string', format: 'password', example: 'Admin123!' }
                  }
                },
                {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['name', 'username', 'email', 'password'],
                    properties: {
                      name: { type: 'string', example: 'Jane Admin' },
                      username: { type: 'string', example: 'janeadmin' },
                      email: { type: 'string', format: 'email', example: 'janeadmin@example.com' },
                      password: { type: 'string', format: 'password', example: 'Admin123!' }
                    }
                  }
                }
              ]
            }
          }
        },
        responses: {
          '201': {
            description: 'Admin user created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      oneOf: [
                        {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                            username: { type: 'string' },
                            role: { type: 'string', example: 'admin' }
                          }
                        },
                        {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              email: { type: 'string' },
                              username: { type: 'string' },
                              role: { type: 'string', example: 'admin' }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Bad request' },
          '403': { description: 'Only Super Admin can create admin users' },
          '409': { description: 'User already exists' }
        }
      }
    },
    '/cases': {
      get: {
        tags: ['Cases'],
        summary: 'List cases with pagination and filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' }, required: false },
          { in: 'query', name: 'limit', schema: { type: 'integer' }, required: false },
          { in: 'query', name: 'status', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'priority', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'type', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'court', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'location', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'search', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'fromDate', schema: { type: 'string', format: 'date' }, required: false },
          { in: 'query', name: 'toDate', schema: { type: 'string', format: 'date' }, required: false }
        ],
        responses: { '200': { description: 'Cases list returned' } }
      },
      post: { tags: ['Cases'], security: [{ bearerAuth: [] }] }
    },
    '/cases/export/excel': {
      get: {
        tags: ['Cases'],
        summary: 'Export visible cases as CSV',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Excel export returned' } }
      }
    },
    '/cases/export/pdf': {
      get: {
        tags: ['Cases'],
        summary: 'Export visible cases as PDF',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'PDF export returned' } }
      }
    },
    '/cases/{id}': {
      get: {
        tags: ['Cases'],
        summary: 'Get case details',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Case returned' } }
      },
      put: {
        tags: ['Cases'],
        summary: 'Update case',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Case updated' } }
      },
      delete: {
        tags: ['Cases'],
        summary: 'Soft delete case',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Case deleted' } }
      }
    },
    '/cases/{id}/status': {
      patch: {
        tags: ['Cases'],
        summary: 'Update case status',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Status updated' } }
      }
    },
    '/cases/{id}/timeline': {
      get: {
        tags: ['Cases'],
        summary: 'Get case timeline',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Timeline returned' } }
      },
      post: {
        tags: ['Cases'],
        summary: 'Add timeline event',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Timeline event added' } }
      }
    },
    '/cases/{id}/export/pdf': {
      get: {
        tags: ['Cases'],
        summary: 'Export single case detail PDF',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Single case PDF returned' } }
      }
    },
    '/cases/{caseId}/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List documents for a case',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Documents returned' } }
      },
      post: {
        tags: ['Documents'],
        summary: 'Upload one or more files to a case',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Files uploaded' } }
      }
    },
    '/documents/{id}/download': {
      get: {
        tags: ['Documents'],
        summary: 'Download a document',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Document file returned' } }
      }
    },
    '/documents/{id}': {
      delete: {
        tags: ['Documents'],
        summary: 'Delete a document',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Document deleted' } }
      }
    },
    '/cases/{caseId}/hearings': {
      get: {
        tags: ['Hearings'],
        summary: 'List hearings for a case',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Hearings for case returned' } }
      },
      post: {
        tags: ['Hearings'],
        summary: 'Create a hearing for a case',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Hearing created' } }
      }
    },
    '/hearings': {
      get: {
        tags: ['Hearings'],
        summary: 'Global hearing list with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'responsiblePerson', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'caseId', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'fromDate', schema: { type: 'string', format: 'date' }, required: false },
          { in: 'query', name: 'toDate', schema: { type: 'string', format: 'date' }, required: false }
        ],
        responses: { '200': { description: 'Hearing list returned' } }
      }
    },
    '/hearings/{id}': {
      get: {
        tags: ['Hearings'],
        summary: 'Get hearing by id',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Hearing returned' } }
      },
      put: {
        tags: ['Hearings'],
        summary: 'Update hearing',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Hearing updated' } }
      },
      delete: {
        tags: ['Hearings'],
        summary: 'Delete hearing',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Hearing deleted' } }
      }
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard summary metrics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Dashboard summary returned' }
        }
      }
    },
    '/dashboard/case-status-distribution': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get case status distribution',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Distribution returned' } }
      }
    },
    '/dashboard/priority-distribution': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get case priority distribution',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Distribution returned' } }
      }
    },
    '/dashboard/cases-by-type': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get cases grouped by type',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Data returned' } }
      }
    },
    '/dashboard/cases-by-location': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get cases grouped by location',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Data returned' } }
      }
    },
    '/dashboard/hearings-this-week': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get this week hearing list',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Hearings returned' } }
      }
    },
    '/dashboard/hearings-next-week': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get next week hearing list',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Hearings returned' } }
      }
    },
    '/dashboard/critical-cases': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get critical cases',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Critical cases returned' } }
      }
    },
    '/dashboard/recent-activities': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get recent case activities',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Recent activities returned' } }
      }
    },
    '/dashboard/recent-hearing-updates': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get recent hearing updates',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Updates returned' } }
      }
    },
    '/dashboard/export': {
      get: {
        tags: ['Dashboard'],
        summary: 'Export dashboard snapshot',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dashboard snapshot exported' } }
      }
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notifications for the bell dropdown and unread count',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notifications returned' } }
      }
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notification marked as read' } }
      }
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all unread notifications as read',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'All notifications marked as read' } }
      }
    },
    '/calendar': {
      get: {
        tags: ['Calendar'],
        summary: 'Merged calendar view for hearings, deadlines, meetings, holidays',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'month', schema: { type: 'integer' }, required: false },
          { in: 'query', name: 'year', schema: { type: 'integer' }, required: false }
        ],
        responses: { '200': { description: 'Calendar events returned' } }
      }
    },
    '/calendar/events': {
      post: {
        tags: ['Calendar'],
        summary: 'Create a custom calendar event',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Calendar event created' } }
      }
    },
    '/calendar/events/{id}': {
      put: {
        tags: ['Calendar'],
        summary: 'Update custom calendar event',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Calendar event updated' } }
      },
      delete: {
        tags: ['Calendar'],
        summary: 'Delete custom calendar event',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Calendar event deleted' } }
      }
    },
    '/settings/general': {
      get: {
        tags: ['Settings'],
        summary: 'Get general settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'General settings returned' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update general settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'General settings updated' } }
      }
    },
    '/settings/display': {
      get: {
        tags: ['Settings'],
        summary: 'Get display settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Display settings returned' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update display settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Display settings updated' } }
      }
    },
    '/settings/notifications': {
      get: {
        tags: ['Settings'],
        summary: 'Get notification settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notification settings returned' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update notification settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notification settings updated' } }
      }
    },
    '/settings/security': {
      get: {
        tags: ['Settings'],
        summary: 'Get security settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Security settings returned' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update security settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Security settings updated' } }
      }
    },
    '/settings/integrations': {
      get: {
        tags: ['Settings'],
        summary: 'Get integration settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Integration settings returned' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update integration settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Integration settings updated' } }
      }
    },
    '/settings/backup': {
      post: {
        tags: ['Settings'],
        summary: 'Trigger backup export',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Backup created' } }
      }
    },
    '/settings/restore': {
      post: {
        tags: ['Settings'],
        summary: 'Restore system from backup file',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Restore completed' } }
      }
    },
    '/settings/audit-logs': {
      get: {
        tags: ['Settings'],
        summary: 'Get paginated audit logs with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' }, required: false },
          { in: 'query', name: 'limit', schema: { type: 'integer' }, required: false },
          { in: 'query', name: 'userId', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'action', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'entity', schema: { type: 'string' }, required: false },
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date-time' }, required: false },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date-time' }, required: false }
        ],
        responses: { '200': { description: 'Audit logs returned' } }
      }
    },
    '/roles': {
      get: {
        tags: ['Users'],
        summary: 'List roles',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Roles returned' } }
      },
      post: {
        tags: ['Users'],
        summary: 'Create a role',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Role created' } }
      }
    },
    '/roles/{id}': {
      put: {
        tags: ['Users'],
        summary: 'Update role',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Role updated' } }
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete role',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Role deleted' } }
      }
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users with stats',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Users and stats returned' } }
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'User created' } }
      }
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by id',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User returned' } }
      },
      put: {
        tags: ['Users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User updated' } }
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User deleted' } }
      }
    },
    '/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Update user status',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User status updated' } }
      }
    },
    '/lookups/courts': {
      get: {
        tags: ['Lookups'],
        summary: 'List courts',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Courts returned' } }
      },
      post: {
        tags: ['Lookups'],
        summary: 'Create a court',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Court created' } }
      }
    },
    '/lookups/locations': {
      get: {
        tags: ['Lookups'],
        summary: 'List locations',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Locations returned' } }
      },
      post: {
        tags: ['Lookups'],
        summary: 'Create a location',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Location created' } }
      }
    },
    '/lookups/case-types': {
      get: {
        tags: ['Lookups'],
        summary: 'List case types',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Case types returned' } }
      }
    },
    '/lookups/practice-areas': {
      get: {
        tags: ['Lookups'],
        summary: 'List practice areas',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Practice areas returned' } }
      }
    },
    '/search': {
      get: {
        tags: ['Search'],
        summary: 'Global search across cases, hearings, courts, locations, and users',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'q', schema: { type: 'string' }, required: false }],
        responses: { '200': { description: 'Search results returned' } }
      }
    },
    '/reports/quick': {
      get: {
        tags: ['Reports'],
        summary: 'List quick report definitions',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Quick report definitions returned' } }
      }
    },
    '/reports/case-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Get overall case summary for reports',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Case summary returned' } }
      }
    },
    '/reports/hearing-schedule': {
      get: {
        tags: ['Reports'],
        summary: 'Get hearing schedule within a date range',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' }, required: false },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' }, required: false }
        ],
        responses: { '200': { description: 'Hearing schedule returned' } }
      }
    },
    '/reports/advocate-workload': {
      get: {
        tags: ['Reports'],
        summary: 'Get advocate workload by assigned hearing count',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Advocate workload returned' } }
      }
    },
    '/reports/case-status': {
      get: {
        tags: ['Reports'],
        summary: 'Get case status distribution report',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Case status distribution returned' } }
      }
    },
    '/reports/hearing-outcome': {
      get: {
        tags: ['Reports'],
        summary: 'Get hearing outcomes summary',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Hearing outcomes returned' } }
      }
    },
    '/reports/timeline-compliance': {
      get: {
        tags: ['Reports'],
        summary: 'Get timeline compliance metrics',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Timeline compliance returned' } }
      }
    },
    '/reports/document-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Get document summary report',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Document summary returned' } }
      }
    },
    '/reports/custom': {
      post: {
        tags: ['Reports'],
        summary: 'Build and save a custom report',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Custom report created' } }
      }
    },
    '/reports/history': {
      get: {
        tags: ['Reports'],
        summary: 'Get recent generated reports history',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Recent reports returned' } }
      }
    },
    '/reports/{id}/download': {
      get: {
        tags: ['Reports'],
        summary: 'Download a report JSON payload',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Report file downloaded' } }
      }
    }
  }
};