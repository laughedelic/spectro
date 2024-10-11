import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { pink } from '@mui/material/colors'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { makeStyles } from 'tss-react/mui'
import useMediaQuery from '@mui/material/useMediaQuery'
import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import ClearIcon from '@mui/icons-material/Clear'
import CloseIcon from '@mui/icons-material/Close'
import MicIcon from '@mui/icons-material/Mic'
import SettingsIcon from '@mui/icons-material/Settings'
import StopIcon from '@mui/icons-material/Stop'
import React, {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { GRADIENTS } from '../color-util.ts'
import { hzToMel, melToHz } from '../math-util.ts'
import { Scale } from '../spectrogram.ts'
import { RenderParameters } from '../spectrogram-render.ts'

import generateLabelledSlider from './LabelledSlider.tsx'

const controlsTheme = createTheme({
  palette: {
    type: 'dark',
    background: {
      default: '#101010',
      paper: '#222222',
    },
    primary: {
      main: '#ffffff',
    },
    secondary: {
      main: pink[500],
    },
  },
})

const useStyles = makeStyles()((theme) => ({
  select: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  sliderLabelContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  divider: {
    marginBottom: theme.spacing(2),
  },
  buttonContainer: {
    position: 'relative',
    marginBottom: theme.spacing(1),
  },
  buttonProgress: {
    color: pink[500],
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  lastButton: {
    marginBottom: theme.spacing(2),
  },
  closeButton: {
    marginTop: -theme.spacing(1.5),
    marginLeft: -theme.spacing(1.5),
    width: theme.spacing(6),
  },
  settingsHeader: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  settingsButton: {
    borderTopLeftRadius: theme.spacing(2),
    borderTopRightRadius: theme.spacing(2),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: `${theme.spacing(1.5)}px ${theme.spacing(3)}px`,
  },
  settingsDrawer: {
    backgroundColor: 'transparent',
  },
  settingsDrawerInner: {
    borderTopLeftRadius: theme.spacing(2),
    borderTopRightRadius: theme.spacing(2),
    maxWidth: '300px',
    padding: theme.spacing(2),
    boxSizing: 'border-box',
    margin: `${theme.spacing(2)}px auto 0 auto`,
  },
}))

const formatHz = (hz: number) => {
  if (hz < 999.5) {
    return `${hz.toPrecision(3)} Hz`
  }
  return `${(hz / 1000).toPrecision(3)} kHz`
}

const formatPercentage = (value: number) => {
  if (value * 100 >= 999.5) {
    return `${(value * 100).toPrecision(4)}%`
  }
  return `${(value * 100).toPrecision(3)}%`
}

export type PlayState = 'stopped' | 'loading-file' | 'loading-mic' | 'playing'

export interface SettingsContainerProps {
  onStop: () => void
  onClearSpectrogram: () => void
  onRenderParametersUpdate: (settings: Partial<RenderParameters>) => void
  onRenderFromMicrophone: () => void
  onRenderFromFile: (file: ArrayBuffer) => void
}

export type SettingsContainer = (props: SettingsContainerProps) => JSX.Element

function generateSettingsContainer(): [SettingsContainer, (playState: PlayState) => void] {
  let setPlayStateExport: ((playState: PlayState) => void) | null = null

  const SettingsContainer = ({
    onStop,
    onClearSpectrogram,
    onRenderParametersUpdate,
    onRenderFromMicrophone,
    onRenderFromFile,
  }: SettingsContainerProps) => {
    const { current: defaultParameters } = useRef({
      sensitivity: 0.5,
      contrast: 0.5,
      zoom: 4,
      minFrequency: 10,
      maxFrequency: 12000,
      scale: 'mel' as Scale,
      gradient: 'Heated Metal',
    })

    const { classes } = useStyles()
    const isMobile = useMediaQuery('(max-width: 800px)')
    const [settingsOpen, setSettingsOpen] = useState(false)

    const openSettings = useCallback(() => setSettingsOpen(true), [setSettingsOpen])
    const closeSettings = useCallback(() => setSettingsOpen(false), [setSettingsOpen])

    const onInnerPaperClick = useCallback((e: MouseEvent) => e.stopPropagation(), [])

    const fileRef = useRef<HTMLInputElement | null>(null)

    const [playState, setPlayState] = useState<PlayState>('stopped')
    const [SensitivitySlider, setSensitivity] = useMemo(generateLabelledSlider, [])
    const [ContrastSlider, setContrast] = useMemo(generateLabelledSlider, [])
    const [ZoomSlider, setZoom] = useMemo(generateLabelledSlider, [])
    const [MinFrequencySlider, setMinFrequency] = useMemo(generateLabelledSlider, [])
    const [MaxFrequencySlider, setMaxFrequency] = useMemo(generateLabelledSlider, [])

    const onPlayMicrophoneClick = useCallback(() => {
      setPlayState('loading-mic')
      onRenderFromMicrophone()
    }, [onRenderFromMicrophone, setPlayState])
    const onPlayFileClick = useCallback(() => {
      if (fileRef.current === null) {
        return
      }
      fileRef.current.click()
    }, [fileRef])
    const onFileChange = useCallback(() => {
      if (
        fileRef.current === null ||
        fileRef.current.files === null ||
        fileRef.current.files.length !== 1
      ) {
        return
      }

      const file = fileRef.current.files[0]
      const reader = new FileReader()
      setPlayState('loading-file')
      reader.addEventListener('load', () => {
        if (fileRef.current !== null) {
          fileRef.current.value = ''
        }

        if (reader.result instanceof ArrayBuffer) {
          onRenderFromFile(reader.result)
        } else {
          setPlayState('stopped')
        }
      })
      reader.readAsArrayBuffer(file)
    }, [fileRef, setPlayState, onRenderFromFile])
    const onStopClick = useCallback(() => {
      onStop()
      setPlayState('stopped')
    }, [setPlayState])
    const onSensitivityChange = useCallback(
      (value: number) => {
        defaultParameters.sensitivity = value
        const scaledValue = 10 ** (value * 3) - 1
        onRenderParametersUpdate({ sensitivity: scaledValue })
        setSensitivity(formatPercentage(value))
      },
      [onRenderParametersUpdate, setSensitivity],
    )
    const onContrastChange = useCallback(
      (value: number) => {
        defaultParameters.contrast = value
        const scaledValue = 10 ** (value * 6) - 1
        onRenderParametersUpdate({ contrast: scaledValue })
        setContrast(formatPercentage(value))
      },
      [onRenderParametersUpdate, setSensitivity],
    )
    const onZoomChange = useCallback(
      (value: number) => {
        defaultParameters.zoom = value
        onRenderParametersUpdate({ zoom: value })
        setZoom(formatPercentage(value))
      },
      [onRenderParametersUpdate, setSensitivity],
    )
    const onMinFreqChange = useCallback(
      (value: number) => {
        const hz = melToHz(value)
        defaultParameters.minFrequency = hz
        onRenderParametersUpdate({ minFrequencyHz: hz })
        setMinFrequency(formatHz(hz))
      },
      [onRenderParametersUpdate, setSensitivity],
    )
    const onMaxFreqChange = useCallback(
      (value: number) => {
        const hz = melToHz(value)
        defaultParameters.maxFrequency = hz
        onRenderParametersUpdate({ maxFrequencyHz: hz })
        setMaxFrequency(formatHz(hz))
      },
      [onRenderParametersUpdate, setSensitivity],
    )
    const onScaleChange = useCallback(
      (event: ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
        if (typeof event.target.value === 'string') {
          defaultParameters.scale = event.target.value as Scale
          onRenderParametersUpdate({ scale: event.target.value as Scale })
        }
      },
      [onRenderParametersUpdate],
    )
    const onGradientChange = useCallback(
      (event: ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
        if (typeof event.target.value === 'string') {
          const gradientData = GRADIENTS.find((g) => g.name === event.target.value)
          if (gradientData !== undefined) {
            defaultParameters.gradient = gradientData.name
            onRenderParametersUpdate({ gradient: gradientData.gradient })
          }
        }
      },
      [onRenderParametersUpdate],
    )

    useEffect(() => {
      setPlayStateExport = setPlayState
    }, [setPlayState])

    // Update all parameters on mount
    useEffect(() => {
      onSensitivityChange(defaultParameters.sensitivity)
      onContrastChange(defaultParameters.contrast)
      onZoomChange(defaultParameters.zoom)
      onMinFreqChange(hzToMel(defaultParameters.minFrequency))
      onMaxFreqChange(hzToMel(defaultParameters.maxFrequency))
      onRenderParametersUpdate({ scale: defaultParameters.scale })

      const gradientData = GRADIENTS.find((g) => g.name === defaultParameters.gradient)
      if (gradientData !== undefined) {
        onRenderParametersUpdate({ gradient: gradientData.gradient })
      }
    }, [])

    const content = (
      <>
        <div className={classes.buttonContainer}>
          <Button
            fullWidth
            variant='contained'
            color='primary'
            onClick={onPlayMicrophoneClick}
            startIcon={<MicIcon />}
            disabled={playState !== 'stopped'}
          >
            Record from mic
          </Button>
          {playState === 'loading-mic' && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </div>
        <input
          type='file'
          style={{ display: 'none' }}
          accept='audio/x-m4a,audio/*'
          onChange={onFileChange}
          ref={fileRef}
        />
        <div className={classes.buttonContainer}>
          <Button
            fullWidth
            variant='contained'
            color='primary'
            onClick={onPlayFileClick}
            startIcon={<AudiotrackIcon />}
            disabled={playState !== 'stopped'}
          >
            Play audio file
          </Button>
          {playState === 'loading-file' && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </div>

        <Button
          fullWidth
          className={classes.lastButton}
          variant='outlined'
          color='secondary'
          onClick={onStopClick}
          startIcon={<StopIcon />}
          disabled={playState !== 'playing'}
        >
          Stop
        </Button>

        <Divider className={classes.divider} />

        <SensitivitySlider
          nameLabelId='sensitivity-slider-label'
          nameLabel='Sensitivity'
          min={0}
          max={1}
          step={0.001}
          defaultValue={defaultParameters.sensitivity}
          onChange={onSensitivityChange}
        />
        <ContrastSlider
          nameLabelId='contrast-slider-label'
          nameLabel='Contrast'
          min={0}
          max={1}
          step={0.001}
          defaultValue={defaultParameters.contrast}
          onChange={onContrastChange}
        />
        <ZoomSlider
          nameLabelId='zoom-slider-label'
          nameLabel='Zoom'
          min={1}
          max={10}
          step={0.01}
          defaultValue={defaultParameters.zoom}
          onChange={onZoomChange}
        />
        <MinFrequencySlider
          nameLabelId='min-freq-slider-label'
          nameLabel='Min. frequency'
          min={hzToMel(0)}
          max={hzToMel(20000)}
          step={1}
          defaultValue={hzToMel(defaultParameters.minFrequency)}
          onChange={onMinFreqChange}
        />
        <MaxFrequencySlider
          nameLabelId='max-freq-slider-label'
          nameLabel='Max. frequency'
          min={hzToMel(0)}
          max={hzToMel(20000)}
          step={1}
          defaultValue={hzToMel(defaultParameters.maxFrequency)}
          onChange={onMaxFreqChange}
        />
        <FormControl className={classes.select}>
          <InputLabel id='scale-select-label'>Frequency scale</InputLabel>
          <Select
            labelId='scale-select-label'
            id='scale-select'
            defaultValue={defaultParameters.scale}
            onChange={onScaleChange}
          >
            <MenuItem value='mel'>Mel</MenuItem>
            <MenuItem value='linear'>Linear</MenuItem>
          </Select>
        </FormControl>
        <FormControl className={classes.select}>
          <InputLabel id='gradient-select-label'>Colour</InputLabel>
          <Select
            labelId='gradient-select-label'
            id='gradient-select'
            defaultValue={defaultParameters.gradient}
            onChange={onGradientChange}
          >
            {GRADIENTS.map((g) => (
              <MenuItem value={g.name} key={g.name}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          fullWidth
          variant='text'
          color='secondary'
          onClick={onClearSpectrogram}
          startIcon={<ClearIcon />}
        >
          Clear spectrogram
        </Button>
      </>
    )

    return (
      <ThemeProvider theme={controlsTheme}>
        <ScopedCssBaseline>
          {isMobile
            ? (
              <>
                <Button
                  size='large'
                  className={classes.settingsButton}
                  variant='contained'
                  color='primary'
                  startIcon={<SettingsIcon />}
                  onClick={openSettings}
                  disableElevation
                >
                  Settings
                </Button>
                <Drawer
                  anchor='bottom'
                  open={settingsOpen}
                  onClose={closeSettings}
                  classes={{
                    paperAnchorBottom: classes.settingsDrawer,
                  }}
                  PaperProps={{ elevation: 0, onClick: closeSettings }}
                >
                  <Paper
                    classes={{ root: classes.settingsDrawerInner }}
                    elevation={16}
                    onClick={onInnerPaperClick}
                  >
                    <div className={classes.settingsHeader}>
                      <IconButton
                        aria-label='close'
                        onClick={closeSettings}
                        className={classes.closeButton}
                      >
                        <CloseIcon />
                      </IconButton>
                      <Typography variant='subtitle1'>Settings</Typography>
                    </div>
                    {content}
                  </Paper>
                </Drawer>
              </>
            )
            : content}
        </ScopedCssBaseline>
      </ThemeProvider>
    )
  }

  return [
    SettingsContainer,
    (playState) => {
      if (setPlayStateExport !== null) {
        setPlayStateExport(playState)
      } else {
        throw new Error('Attempt to set play state before component mount')
      }
    },
  ]
}

export default generateSettingsContainer
