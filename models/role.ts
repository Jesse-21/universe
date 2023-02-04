import mongoose from "mongoose";
import { RoleSchema } from "../schema/main.js";

class RoleClass extends mongoose.Model {
  static async findRoleById({ id }: { id: string }): Promise<RoleClass | null> {
    const role = await this.findOne({ _id: id });
    if (role?.isHidden) return null;
    return role;
  }

  static async _generateUniqueSlug({
    name,
    dimensionId,
    index = 0,
  }: {
    name: string;
    dimensionId: string;
    index?: number;
  }): Promise<string> {
    if (index > 10) throw new Error("Cannot generate unique slug");

    let slug = "";
    if (!index) {
      slug = `${name.toLowerCase().replace(/\s/g, "-")}`;
    } else {
      const random = Math.floor(1000 + Math.random() * 9000);
      slug = `${name.toLowerCase().replace(/\s/g, "-")}-${random}`;
    }

    const found = await this.exists({ slug, community: dimensionId });
    if (found)
      return this._generateUniqueSlug({ name, dimensionId, index: index + 1 });
    return slug;
  }

  static async findAndSort({
    dimensionId,
    limit = 10,
    offset = 0,
  }: {
    dimensionId: string;
    limit?: number;
    offset?: number;
  }): Promise<RoleClass[]> {
    if (!dimensionId) throw new Error("Invalid dimension");
    const roles = await this.find({
      community: dimensionId,
    })
      .sort("-createdAt")
      .limit(limit)
      .skip(offset);
    return roles.filter((role) => role.isHidden !== true);
  }

  static async findDefaultPublicRoleForCommunity({
    dimensionId,
  }: {
    dimensionId: string;
  }): Promise<RoleClass | null> {
    if (!dimensionId) throw new Error("Invalid dimension");
    return await this.findOne({ dimension: dimensionId, slug: "public" });
  }

  static async findDefaultOwnerRoleForCommunity({
    dimensionId,
  }: {
    dimensionId: string;
  }): Promise<RoleClass | null> {
    if (!dimensionId) throw new Error("Invalid dimension");
    return this.findOne({ dimension: dimensionId, slug: "owner" });
  }

  async delete(): Promise<string> {
    this.isHidden = true;
    this.slug = `deleted-${this.slug}`;

    await this.save();
    return this._id;
  }
}

RoleSchema.loadClass(RoleClass);

export const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
