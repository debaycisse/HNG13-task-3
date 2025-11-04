import { Mastra } from "@mastra/core/mastra"
import { clothAgent } from "./agents/cloth-agent"
import { registerApiRoute } from "@mastra/core/server"
import { randomUUID } from "crypto"

export const mastra = new  Mastra({
  agents: { clothAgent },
  server: {
    apiRoutes: [
      registerApiRoute("/a2a/clothing", {
        method: "POST",
        handler: async (mastraContext) => {
          try {
            const body = await mastraContext.req.json();

            if (body.jsonrpc !== "2.0" || !body.method || !body.id) {
              return mastraContext.json({
                jsonrpc: "2.0",
                id: body?.id || null,
                error: {
                  code: -32600,
                  message: "Invalid Request: must follow JSON-RPC 2.0 format",
                  data: {}
                }
              })
            }
            // Retrieve the user's input from telex payload
            const message = body.params?.message
            const userTextInput = message?.parts?.[0]?.text?.trim()

            if (!userTextInput) {
              return mastraContext.json({
                jsonrpc: "2.0",
                id: body.id,
                error: {
                  code: -32602,
                  message: "Invalid parameter or missing text input parameter",
                  data: {}
                }
              })
            }

            // Bring up the cloth agent
            const mastraObj = mastraContext.get('mastra')
            const theAgent = await mastraObj.getAgent('clothAgent')

            // Obtain the response from the agent
            const agentResult = await theAgent.generate(userTextInput)
            const agentResponse = agentResult.text || 'No response'

            const resultOrTaskId = body.params.taskId || randomUUID()

            // Construct A2A response
            const a2aResponseContent = {
              jsonrpc: '2.0',
              id: body.id,
              result: {
                id: resultOrTaskId,
                contextId: randomUUID(),
                status: {
                  state: 'completed',
                  timestamp: (new Date()).toISOString(),
                  message: {
                    messageId: randomUUID(),
                    role: 'agent',
                    parts: [
                      {
                        kind: 'text',
                        text: agentResponse
                      }
                    ],
                    kind: 'message',
                    taskId: resultOrTaskId,
                  }
                },
                artifacts: [
                  {
                    artifactId: randomUUID(),
                    name: 'cloth',
                    parts: [
                      {
                        kind: 'message',
                        text: agentResponse
                      }
                    ]
                  }
                ],
                history: [],
                kind: 'task'
              }
            }
            return mastraContext.json(a2aResponseContent)
          } catch (error) {
            return mastraContext.json({
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32603,
                message: 'Internal error while processing A2A request'
              }
            })
          }
        }
      })
    ]
  }
})