/* External Imports */
import {
  getLogger,
  logError,
  ScheduledTask,
} from '@eth-optimism/core-utils/build'

/* Internal Imports */
import { L1DataService } from '../../../types/data'
import { GethSubmission, L2NodeService } from '../../../types'

const log = getLogger('l2-batch-submitter')

/**
 * Polls the database for new Rollup Transactions that were submitted to L1 that
 * have not yet been processed by L2 and submits them one-by-one to L2.
 */
export class QueuedGethSubmitter extends ScheduledTask {
  constructor(
    private readonly l1DataService: L1DataService,
    private readonly l2NodeService: L2NodeService,
    periodMilliseconds: number = 10_000
  ) {
    super(periodMilliseconds)
  }

  /**
   * @inheritDoc
   */
  public async runTask(): Promise<void> {
    let gethSubmission: GethSubmission
    try {
      gethSubmission = await this.l1DataService.getNextQueuedGethSubmission()
    } catch (e) {
      logError(log, `Error fetching next Geth Submission!`, e)
      return
    }

    if (!gethSubmission) {
      log.debug(`No Geth Submissions ready to be sent.`)
      return
    }

    try {
      await this.l2NodeService.sendGethSubmission(gethSubmission)
    } catch (e) {
      logError(
        log,
        `Error sending Geth Submission: ${JSON.stringify(gethSubmission)}`,
        e
      )
      return
    }

    try {
      await this.l1DataService.markQueuedGethSubmissionSubmittedToGeth(
        gethSubmission.submissionNumber
      )
    } catch (e) {
      logError(
        log,
        `Error marking Geth Submission submitted to Geth. L1 Batch Number: ${gethSubmission.submissionNumber}`,
        e
      )
      return
    }
  }
}
