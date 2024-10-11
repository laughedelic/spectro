/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { generateSpectrogram } from '../spectrogram.ts'
import {
  ACTION_COMPUTE_SPECTROGRAM,
  ComputeSpectrogramMessage,
  Message,
} from '../worker-constants.ts'

self.addEventListener('message', (event: { data: Message['request'] }) => {
  const {
    data: { action, payload },
  } = event

  switch (action) {
    case ACTION_COMPUTE_SPECTROGRAM: {
      const {
        samplesBuffer,
        samplesStart,
        samplesLength,
        options,
      } = payload as ComputeSpectrogramMessage['request']['payload']

      try {
        const samples = new Float32Array(samplesBuffer)
        const {
          windowCount: spectrogramWindowCount,
          options: spectrogramOptions,
          spectrogram,
        } = generateSpectrogram(
          samples,
          samplesStart,
          samplesLength,
          options,
        )

        const response: ComputeSpectrogramMessage['response'] = {
          payload: {
            spectrogramWindowCount,
            spectrogramOptions,
            spectrogramBuffer: spectrogram.buffer,
            inputBuffer: samples.buffer,
          },
        }
        self.postMessage(response, [
          spectrogram.buffer,
          samples.buffer,
        ])
      } catch (error) {
        const response: ComputeSpectrogramMessage['response'] = {
          error,
        }
        self.postMessage(response)
      }

      break
    }
    default:
      self.postMessage({
        error: new Error('Unknown action'),
      })
      break
  }
})
