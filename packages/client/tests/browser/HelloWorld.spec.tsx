import React from 'react'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import App from '../../src/App'

test('renders name', async () => {
    const screen = render(<App />)
    await expect.element(screen.getByText("Z02 Test Viz")).toBeInTheDocument()
})