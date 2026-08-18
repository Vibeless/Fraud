import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKey } from "../../database/entities";
import { AppConfigService } from "../../config/app-config.service";
import { hashSecret } from "../../common/crypto/argon2.util";
import { generateApiKey } from "../../common/crypto/api-key-generator.util";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import {
  ApiKeyCreatedResponse,
  ApiKeyListResponse,
} from "./dto/api-key-response.dto";
import { ErrorCode } from "../../common/filters/api-error";

/**
 * Service managing the API key lifecycle (AAD §3, OAS §9).
 */
@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
    private readonly config: AppConfigService,
  ) {}

  async create(
    agencyId: string,
    dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponse> {
    const { rawKey, keyPrefix } = generateApiKey(this.config.apiKey.prefix);
    const keyHash = await hashSecret(rawKey, this.config.argon2.apiKeyPepper);

    const entity = this.apiKeys.create({
      agencyId,
      name: dto.name,
      scopes: dto.scopes,
      keyPrefix,
      keyHash,
    });

    const saved = await this.apiKeys.save(entity);

    return {
      id: saved.id,
      key: rawKey,
      keyPrefix: saved.keyPrefix,
    };
  }

  async list(agencyId: string | null): Promise<ApiKeyListResponse> {
    const keys = await this.apiKeys.find({
      ...(agencyId !== null ? { where: { agencyId } } : {}),
      select: [
        "id",
        "keyPrefix",
        "name",
        "scopes",
        "createdAt",
        "lastUsedAt",
        "revokedAt",
      ],
      order: { createdAt: "DESC" },
    });

    return {
      data: keys.map((k) => ({
        id: k.id,
        keyPrefix: k.keyPrefix,
        name: k.name,
        scopes: k.scopes,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        revokedAt: k.revokedAt,
      })),
    };
  }

  async revoke(agencyId: string | null, id: string): Promise<void> {
    const apiKey = await this.apiKeys.findOne({
      where: agencyId !== null ? { id, agencyId } : { id },
    });

    if (!apiKey) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "API key not found.",
      });
    }

    if (!apiKey.revokedAt) {
      apiKey.revokedAt = new Date();
      await this.apiKeys.save(apiKey);
    }
  }
}
