// adapted from actions/upload-artifact

import * as core from '@actions/core'
import { Inputs, NoFileOptions } from './constants'
import { UploadInputs } from './upload-inputs'

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs {
  const name = core.getInput(Inputs.Name)
  const path = core.getInput(Inputs.Path, { required: true })
  const s3BucketName = core.getInput(Inputs.S3BucketName, { required: true })
  const s3BucketRegion = core.getInput(Inputs.S3BucketRegion, {
    required: true
  })

  const ifNoFilesFound = core.getInput(Inputs.IfNoFilesFound)
  const noFileBehavior: NoFileOptions =
    NoFileOptions[ifNoFilesFound as keyof typeof NoFileOptions]

  if (!noFileBehavior) {
    core.setFailed(
      `Unrecognized ${
        Inputs.IfNoFilesFound
      } input. Provided: ${ifNoFilesFound}. Available options: ${Object.keys(
        NoFileOptions
      )}`
    )
  }

  const inputs: UploadInputs = {
    artifactName: name,
    searchPath: path,
    ifNoFilesFound: noFileBehavior,
    s3BucketName,
    s3BucketRegion
  }

  return inputs
}
