/**
 * @typedef {Object} IdentityKit
 * @property {string} anchor
 * @property {string} profile
 * @property {string} expression
 * @property {string} halfBody
 * @property {string} fullBody
 */

/**
 * @typedef {Object} Character
 * @property {string} id
 * @property {string} name
 * @property {string} age
 * @property {string} origin
 * @property {string} backstory
 * @property {string} visualStyle
 * @property {string} personality
 * @property {string} voiceDescription
 * @property {string[]} catchphrases
 * @property {string} language
 * @property {string} image
 * @property {IdentityKit} identityKit
 * @property {string} timestamp
 * @property {boolean} isPreset
 * @property {Object} sessionState
 */

/**
 * @typedef {'Realistic' | 'Ultra Realistic' | 'Cinematic' | 'Anime' | 'Cartoon' | 'Cyberpunk' | 'Ethereal'} VisualStyle
 */

/**
 * @typedef {Object} PlaygroundNodeData
 * @property {string} label
 * @property {string} image
 * @property {boolean} isOptimistic
 * @property {string} analysisData
 * @property {string} resolution
 * @property {Function} onFocus
 * @property {Function} onDelete
 * @property {Function} [onUpscale]
 */
