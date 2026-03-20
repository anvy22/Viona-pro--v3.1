import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Try to find a workflow
    const wf = await prisma.workflow.findFirst()
    if (!wf) {
      console.log('No workflows found')
      return;
    }
    console.log('Found workflow ID:', wf.id)

    // Try to create a dummy DISCORD node
    const node = await prisma.node.create({
      data: {
        id: 'test-node-1234',
        workflowId: wf.id,
        name: 'Discord Tester',
        type: 'DISCORD',
        position: { x: 0, y: 0 },
        data: {}
      }
    })
    console.log('Successfully created DISCORD node:', node.id)
    
    // Cleanup
    await prisma.node.delete({ where: { id: node.id } })
  } catch (err) {
    console.error('ERROR OCCURRED:')
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}
main()
