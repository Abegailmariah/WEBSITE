import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/track-concern')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/track-concern"!</div>
}
