import React from 'react'
import { createRoot } from 'react-dom/client'

import { RenderParameters } from '../spectrogram-render.ts'

import generateSettingsContainer from './SettingsContainer.tsx'

export default function initialiseControlsUi(
  container: Element,
  props: {
    stopCallback: () => void
    clearSpectrogramCallback: () => void
    renderParametersUpdateCallback: (settings: Partial<RenderParameters>) => void
    renderFromMicrophoneCallback: () => void
    renderFromFileCallback: (file: ArrayBuffer) => void
  },
) {
  const [SettingsContainer, setPlayState] = generateSettingsContainer()

  const root = createRoot(container!)
  root.render(
    <SettingsContainer
      onStop={props.stopCallback}
      onClearSpectrogram={props.clearSpectrogramCallback}
      onRenderParametersUpdate={props.renderParametersUpdateCallback}
      onRenderFromMicrophone={props.renderFromMicrophoneCallback}
      onRenderFromFile={props.renderFromFileCallback}
    />,
  )

  return setPlayState
}
