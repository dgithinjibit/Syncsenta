FROM rust:1.85-bookworm AS builder
WORKDIR /src
COPY Cargo.toml Cargo.lock* ./
COPY rust-core ./rust-core
COPY rust-service ./rust-service
RUN cargo build --release -p syncsenta-adaptive-service

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 --create-home syncsenta
WORKDIR /app
COPY --from=builder /src/target/release/syncsenta-adaptive-service /usr/local/bin/syncsenta-adaptive-service
USER syncsenta
ENV SYNC_SENTA_ADAPTIVE_BIND=0.0.0.0:8091
EXPOSE 8091
ENTRYPOINT ["/usr/local/bin/syncsenta-adaptive-service"]
