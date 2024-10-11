import { assert, assertEquals, assertExists, assertThrows } from '@std/assert';
import { assertSnapshot } from '@std/testing/snapshot';
import { generateSpectrogram, SpectrogramOptions } from './spectrogram.ts';

const sampleRate = 44100;
const samplesLength = 44100; // 1 second of audio
const samplesStart = 0;
const samples = new Float32Array(samplesLength).fill(0);
// Create a simple sine wave at 440 Hz
for (let i = 0; i < samplesLength; i++) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
}

Deno.test('generateSpectrogram with default options', (ctx) => {
    const options: SpectrogramOptions = {
        sampleRate,
        windowSize: 4096,
    };

    const result = generateSpectrogram(
        samples,
        samplesStart,
        samplesLength,
        options,
    );
    assertExists(result.windowCount, "Result should have 'windowCount' property");
    assertExists(result.options, "Result should have 'options' property");
    assertExists(result.spectrogram, "Result should have 'spectrogram' property");
    assert(
        result.windowCount > 0,
        "'windowCount' should be greater than 0",
    );
    assertEquals(
        result.spectrogram.length,
        result.windowCount * (options.windowSize! / 2),
        "'spectrogram.length' should be windowCount * (windowSize / 2)",
    );
    // regression test
    assertSnapshot(ctx, result);
});

Deno.test('generateSpectrogram with linear scale', () => {
    const options: SpectrogramOptions = {
        sampleRate,
        scale: 'linear',
        scaleSize: 128,
    };
    const result = generateSpectrogram(
        samples,
        samplesStart,
        samplesLength,
        options,
    );
    assertEquals(result.options.scale, 'linear', "Scale should be 'linear'");
    assertEquals(
        result.spectrogram.length,
        result.windowCount * 128,
        "'spectrogram.length' should be windowCount * 128",
    );
});

Deno.test('generateSpectrogram with mel scale', () => {
    const options: SpectrogramOptions = {
        sampleRate,
        scale: 'mel',
        scaleSize: 64,
    };
    const result = generateSpectrogram(
        samples,
        samplesStart,
        samplesLength,
        options,
    );
    assertEquals(result.options.scale, 'mel', "Scale should be 'mel'");
    assertEquals(
        result.spectrogram.length,
        result.windowCount * 64,
        "'spectrogram.length' should be windowCount * 64",
    );
});

Deno.test('generateSpectrogram with undefined minFrequencyHz and maxFrequencyHz', () => {
    const options: SpectrogramOptions = {
        sampleRate,
        // minFrequencyHz and maxFrequencyHz are undefined
    };
    const result = generateSpectrogram(
        samples,
        samplesStart,
        samplesLength,
        options,
    );
    assertEquals(result.options.minFrequencyHz, 0, 'minFrequencyHz should be 0');
    const expectedMax = (sampleRate * (4096 - 2)) / (2 * 4096);
    const tolerance = 1e-5;
    assert(
        Math.abs(result.options.maxFrequencyHz - expectedMax) < tolerance,
        `maxFrequencyHz should be close to ${expectedMax}`,
    );
});

Deno.test('generateSpectrogram throws error if windowStepSize is not divisible by windowSize', () => {
    const options: SpectrogramOptions = {
        sampleRate,
        windowSize: 4096,
        windowStepSize: 1000, // Not a divisor of 4096
    };
    assertThrows(
        () => {
            generateSpectrogram(samples, samplesStart, samplesLength, options);
        },
        Error,
        'Window step size must be evenly divisible by the window size',
        'Should throw error when windowStepSize is not divisible by windowSize',
    );
});

Deno.test('generateSpectrogram handles isStart and isEnd flags', () => {
    const options: SpectrogramOptions = {
        sampleRate,
        isStart: true,
        isEnd: true,
    };
    const result = generateSpectrogram(
        samples,
        samplesStart,
        samplesLength,
        options,
    );
    const additionalWindows = Math.floor(4096 / 1024) - 1;
    const expectedWindowCount = Math.ceil(samplesLength / 1024) -
        Math.floor(4096 / 1024) +
        1 +
        additionalWindows * 2;
    assertEquals(
        result.windowCount,
        expectedWindowCount,
        `windowCount should be ${expectedWindowCount}`,
    );
});

Deno.test('generateSpectrogram generates correct spectrogram data for a pure sine wave', (ctx) => {
    const options: SpectrogramOptions = {
        sampleRate,
        windowSize: 4096,
        windowStepSize: 1024,
        scale: 'linear',
        scaleSize: 512,
    };
    const result = generateSpectrogram(
        samples,
        samplesStart,
        samplesLength,
        options,
    );
    // Since the input is a pure sine wave at 440 Hz,
    // we expect a peak around the corresponding frequency bin.

    // Calculate the expected bin for 440 Hz
    const bin = Math.round((440 * 4096) / sampleRate);
    const tolerance = 1; // Allow a small range
    console.debug(`Expected bin: ${bin}`);

    let peakFound = false;
    for (let w = 0; w < result.windowCount; w++) {
        for (let s = bin - tolerance; s <= bin + tolerance; s++) {
            const index = w * 512 + s;
            console.debug(`Window: ${w}, Bin: ${s}, Value: ${result.spectrogram[index]}`);
            if (result.spectrogram[index] > 0.00001) { // Threshold for peak detection
                peakFound = true;
                break;
            }
        }
        if (peakFound) break;
    }
    assert(peakFound, 'A peak around the expected frequency bin should be found');

    // regression test
    assertSnapshot(ctx, result);
});
