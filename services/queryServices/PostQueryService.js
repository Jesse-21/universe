const { Service: PostService } = require("../PostService");

class PostQueryService extends PostService {
  /**
   * Return the rich content if the current account has permission to view it
   * @returns Promise<RichContent>
   */
  async richContent(post, args, context) {
    const canRead = await this.canRead(post, args, context);
    if (!canRead) return null;

    return post?.richContent;
  }
}

module.exports = { Service: PostQueryService };
