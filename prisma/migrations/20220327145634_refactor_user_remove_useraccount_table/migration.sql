-- CreateEnum
CREATE TYPE "enum_user_type" AS ENUM ('default', 'oa', 'admin', 'app');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(255),
    "email" VARCHAR(255),
    "phone_number" VARCHAR(255),
    "password" VARCHAR(255),
    "profile_src" VARCHAR(255),
    "avatar" TEXT,
    "otp_code" VARCHAR(255),
    "account_type" "enum_user_type" NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "token" TEXT,
    "reset_token" TEXT,
    "is_verify" BOOLEAN,
    "is_admin" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);
