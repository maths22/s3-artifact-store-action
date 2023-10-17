import * as core from '@actions/core'
import * as github from '@actions/github'
import { findFilesToUpload } from './search'
import { getInputs } from './input-helper'
import { NoFileOptions } from './constants'

import fs from 'fs'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

async function run(): Promise<void> {
  try {
    const inputs = getInputs()
    const searchResult = await findFilesToUpload(inputs.searchPath)
    if (searchResult.filesToUpload.length === 0) {
      // No files were found, different use cases warrant different types of behavior if nothing is found
      switch (inputs.ifNoFilesFound) {
        case NoFileOptions.warn: {
          core.warning(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
        case NoFileOptions.error: {
          core.setFailed(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
        case NoFileOptions.ignore: {
          core.info(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
      }
    } else {
      const s = searchResult.filesToUpload.length === 1 ? '' : 's'
      core.info(
        `With the provided path, there will be ${searchResult.filesToUpload.length} file${s} uploaded`
      )
      core.debug(`Root artifact directory is ${searchResult.rootDirectory}`)

      if (searchResult.filesToUpload.length > 10000) {
        core.warning(
          `There are over 10,000 files in this artifact, consider creating an archive before upload to improve the upload performance.`
        )
      }

      const destination = `${github.context.repo.owner}/${github.context.repo.repo}/${github.context.workflow}/${github.context.runId}/${inputs.artifactName}`

      const client = new S3Client({ region: inputs.s3BucketRegion })

      core.info(
        `Uploading ${searchResult.filesToUpload.length} files to ${inputs.s3BucketName}/${destination}`
      )
      const failedItems = []
      let count = 0
      for (const file of searchResult.filesToUpload) {
        try {
          const relativePath = file.replace(searchResult.rootDirectory, '')
          const stream = fs.createReadStream(file)
          core.info(`Uploading ${file}...`)

          const parallelUploads3 = new Upload({
            client: client,
            params: {
              Bucket: inputs.s3BucketName,
              Key: `${destination}/${relativePath}`,
              Body: stream
            }
          })

          await parallelUploads3.done()

          core.info(
            `  ...completed [${count} / ${searchResult.filesToUpload.length}]`
          )
        } catch (ex) {
          failedItems.push(file)
        }
      }

      if (failedItems.length > 0) {
        core.setFailed(
          `An error was encountered when uploading ${inputs.artifactName}. There were ${failedItems.length} items that failed to upload.`
        )
      } else {
        core.info(
          `Artifact ${inputs.artifactName} has been successfully uploaded!`
        )
      }
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()
