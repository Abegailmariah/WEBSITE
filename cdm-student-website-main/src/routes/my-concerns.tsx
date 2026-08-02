import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/my-concerns')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/my-concerns"!</div>
}
