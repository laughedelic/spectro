declare module '*.glsl?raw' {
  const shader: string
  export default shader
}

declare module '*.glsl' {
  const shader: string
  export default shader
}
